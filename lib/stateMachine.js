import {
  gameKey,
  teamsKey,
  TEAM_IDS,
  teamCountFor,
  teamDefenseKey,
  roundKey,
  roundVaultKey,
  roundIterationsKey,
  roundFinishedKey,
  roundSummaryKey,
  roundCheckingKey,
  roundTransitionLockKey,
} from './keys.js';
import { generatePassword } from './words.js';
import { getCachedUtility } from './utilityCheck.js';
import { HttpError } from './http.js';

const DEFAULT_DRAFT_SEC = 300;
const DEFAULT_ATTACK_SEC = 600;
const DEFAULT_PROMPTS_PER_ATTEMPT = 8;
export const MAX_PROMPTS_PER_ATTEMPT = 20;
// Each round, a team gets unlimited tries. A try is a short conversation with the opponent's
// vault (up to promptsPerAttempt messages, with memory) that ends with one password guess.

const CAS_SET_SCRIPT = `
local current = redis.call('HGET', KEYS[1], 'state')
if current == ARGV[1] then
  for i = 2, #ARGV, 2 do
    redis.call('HSET', KEYS[1], ARGV[i], ARGV[i+1])
  end
  return 1
else
  return 0
end
`;

// KEYS: game hash, round vault, team defense, checking marker, transition lock. ARGV: round number,
// system prompt, job description, checking marker ttl ms (0 for none). Saves the vault (and the
// team's carried-over defense) only while that round's draft phase is on and the switch to attack
// isn't running, so a save can never land after the vaults were locked in. Returns 1 if saved,
// 0 if the draft phase is over, 2 if the switch to attack is running right now.
const SAVE_VAULT_SCRIPT = `
if redis.call('HGET', KEYS[1], 'state') ~= 'draft' or redis.call('HGET', KEYS[1], 'roundNumber') ~= ARGV[1] then return 0 end
if redis.call('EXISTS', KEYS[5]) == 1 then return 2 end
redis.call('HSET', KEYS[2], 'systemPrompt', ARGV[2], 'jobDescription', ARGV[3])
redis.call('HSET', KEYS[3], 'systemPrompt', ARGV[2], 'jobDescription', ARGV[3])
if tonumber(ARGV[4]) > 0 then redis.call('SET', KEYS[4], '1', 'PX', ARGV[4]) end
return 1
`;

// How long past the draft deadline the switch to attack waits for helpfulness checks still running.
const CHECK_GRACE_MS = 30_000;

// ARGV: expected attempt, prompts per attempt. Returns the new promptsUsed, or -1.
const USE_PROMPT_SCRIPT = `
local attempt = tonumber(redis.call('HGET', KEYS[1], 'attempt') or '1')
local used = tonumber(redis.call('HGET', KEYS[1], 'promptsUsed') or '0')
if attempt ~= tonumber(ARGV[1]) or used >= tonumber(ARGV[2]) then return -1 end
redis.call('HSET', KEYS[1], 'attempt', attempt)
return redis.call('HINCRBY', KEYS[1], 'promptsUsed', 1)
`;

// ARGV: '1' if this is a guess (vs. giving up). Ends the current try and moves to the next one.
// Returns the attempt number that was ended, or -1 if no message was sent yet in this try.
const END_ATTEMPT_SCRIPT = `
local attempt = tonumber(redis.call('HGET', KEYS[1], 'attempt') or '1')
local used = tonumber(redis.call('HGET', KEYS[1], 'promptsUsed') or '0')
if used == 0 then return -1 end
if ARGV[1] == '1' then redis.call('HINCRBY', KEYS[1], 'guessUsed', 1) end
redis.call('HSET', KEYS[1], 'attempt', attempt + 1, 'promptsUsed', 0)
return attempt
`;

// KEYS: game hash, finished set. ARGV: round number, team id. Adds the team to the round's
// finished set and bumps the game's finishedCount once per team, ignoring stale rounds.
const MARK_FINISHED_SCRIPT = `
if redis.call('HGET', KEYS[1], 'roundNumber') ~= ARGV[1] then return 0 end
if redis.call('SADD', KEYS[2], ARGV[2]) == 1 then redis.call('HINCRBY', KEYS[1], 'finishedCount', 1) end
return 1
`;

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampPrompts(v) {
  const n = Math.round(toNum(v, DEFAULT_PROMPTS_PER_ATTEMPT));
  return Math.min(MAX_PROMPTS_PER_ATTEMPT, Math.max(1, n));
}

export function parseGame(raw) {
  if (!raw || Object.keys(raw).length === 0) {
    return {
      state: 'lobby',
      mode: 'duel',
      stage: '',
      roundNumber: 0,
      matches: [],
      finalists: [],
      finishedCount: 0,
      draftEndsAt: null,
      attackEndsAt: null,
      draftDurationSec: DEFAULT_DRAFT_SEC,
      attackDurationSec: DEFAULT_ATTACK_SEC,
      promptsPerAttempt: DEFAULT_PROMPTS_PER_ATTEMPT,
      winnerTeamId: null,
      finalResult: null,
    };
  }
  // matches and finalists are stored as JSON, which the Upstash SDK decodes on read.
  return {
    state: raw.state || 'lobby',
    mode: raw.mode === 'tournament' ? 'tournament' : 'duel',
    stage: raw.stage || '',
    matches: Array.isArray(raw.matches) ? raw.matches : [],
    finalists: Array.isArray(raw.finalists) ? raw.finalists : [],
    finishedCount: toNum(raw.finishedCount, 0),
    roundNumber: toNum(raw.roundNumber, 0),
    draftEndsAt: raw.draftEndsAt ? toNum(raw.draftEndsAt) : null,
    attackEndsAt: raw.attackEndsAt ? toNum(raw.attackEndsAt) : null,
    draftDurationSec: toNum(raw.draftDurationSec, DEFAULT_DRAFT_SEC),
    attackDurationSec: toNum(raw.attackDurationSec, DEFAULT_ATTACK_SEC),
    promptsPerAttempt: clampPrompts(raw.promptsPerAttempt),
    winnerTeamId: raw.winnerTeamId || null,
    finalResult: raw.finalResult || null,
  };
}

export async function getGame(redis) {
  const raw = await redis.hgetall(gameKey());
  return parseGame(raw);
}

// Configured team ids for a mode, in slot order, from an already-read teams hash.
export function configuredTeamIds(teams, mode) {
  return TEAM_IDS.slice(0, teamCountFor(mode)).filter((id) => teams?.[id]);
}

// Configured team ids for a mode, in slot order. Ignores any stray entries left in the hash.
export async function getTeamIds(redis, mode) {
  return configuredTeamIds(await redis.hgetall(teamsKey()), mode);
}

// Splits slot-ordered team ids into head-to-head pairs: 1 vs 2, 3 vs 4.
export function pairUp(teamIds) {
  const pairs = [];
  for (let i = 0; i < teamIds.length; i += 2) {
    pairs.push(teamIds.slice(i, i + 2));
  }
  return pairs;
}

// The team this one plays in the current round, or null if it isn't playing (e.g. knocked out).
export function getOpponentTeamId(game, teamId) {
  const match = game.matches.find((pair) => pair.includes(teamId));
  return match ? match.find((id) => id !== teamId) : null;
}

// Same as getOpponentTeamId, but throws 409 for a team that isn't playing this round.
export function requireOpponentTeamId(game, teamId) {
  const opponentTeamId = getOpponentTeamId(game, teamId);
  if (!opponentTeamId) throw new HttpError(409, "Your team isn't playing this round");
  return opponentTeamId;
}

// The Upstash SDK JSON-parses every hash value it reads, so free text a team typed (rules that are
// themselves JSON, a bare number, a quoted sentence) would come back as an object, number or a
// different string. Vault text is therefore stored JSON-encoded, which the SDK decodes back to the
// exact original string, and coerced to a string on read in case anything older slipped through.
function encodeText(text) {
  return JSON.stringify(String(text ?? ''));
}

function asText(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
}

/**
 * Saves a team's vault text while the given round's draft phase is on. With checkingTtlMs, also
 * marks a helpfulness check as running (clear it with clearChecking).
 * Returns 'saved', 'over' (the draft phase has ended) or 'ending' (the switch to attack is running).
 */
export async function saveVault(redis, roundNumber, teamId, { systemPrompt, jobDescription }, { checkingTtlMs = 0 } = {}) {
  const result = await redis.eval(
    SAVE_VAULT_SCRIPT,
    [
      gameKey(),
      roundVaultKey(roundNumber, teamId),
      teamDefenseKey(teamId),
      roundCheckingKey(roundNumber, teamId),
      roundTransitionLockKey(roundNumber),
    ],
    [String(roundNumber), encodeText(systemPrompt), encodeText(jobDescription), String(checkingTtlMs)],
  );
  return { 1: 'saved', 2: 'ending' }[Number(result)] || 'over';
}

export async function clearChecking(redis, roundNumber, teamId) {
  await redis.del(roundCheckingKey(roundNumber, teamId));
}

export async function getVault(redis, roundNumber, teamId) {
  const raw = await redis.hgetall(roundVaultKey(roundNumber, teamId));
  if (!raw || Object.keys(raw).length === 0) return null;
  // Note: the Upstash SDK JSON-parses hash values automatically on read (and JSON-stringifies
  // non-string values on write), so booleans/arrays come back as real booleans/arrays already -
  // do not JSON.parse or string-compare ('1'/'0') here, that would double-decode or always miss.
  return {
    systemPrompt: asText(raw.systemPrompt),
    jobDescription: asText(raw.jobDescription),
    password: raw.password || '',
    // null until the attack phase starts and the helpfulness check result is locked in.
    utilityPassed: typeof raw.utilityPassed === 'boolean' ? raw.utilityPassed : null,
    utilityReason: raw.utilityReason || '',
    crackedByOpponent: raw.crackedByOpponent === true,
    crackedAtIteration: raw.crackedAtIteration ? toNum(raw.crackedAtIteration) : null,
  };
}

/** A vault is "broken" if it was cracked or failed the helpfulness check. Broken vaults lose. */
export function isVaultBroken(vault) {
  return Boolean(vault && (vault.crackedByOpponent || vault.utilityPassed === false));
}

export async function getIterations(redis, roundNumber, teamId) {
  const raw = await redis.hgetall(roundIterationsKey(roundNumber, teamId));
  return {
    attempt: toNum(raw?.attempt, 1),
    promptsUsed: toNum(raw?.promptsUsed, 0),
    guessUsed: toNum(raw?.guessUsed, 0),
  };
}

/** Player-facing summary of where a team is in its tries this round. */
export function describeIterations(its, promptsPerAttempt) {
  return {
    attempt: its.attempt,
    promptsUsed: its.promptsUsed,
    promptsPerAttempt,
    promptsLeft: Math.max(0, promptsPerAttempt - its.promptsUsed),
    canGuess: its.promptsUsed > 0,
  };
}

async function casUpdateGame(redis, expectedState, fields) {
  const args = [expectedState];
  for (const [k, v] of Object.entries(fields)) {
    args.push(k, String(v));
  }
  const result = await redis.eval(CAS_SET_SCRIPT, [gameKey()], args);
  return Number(result) === 1;
}

/** Atomically uses one message in the given try. Returns the new promptsUsed, or -1 if not allowed. */
export async function usePrompt(redis, roundNumber, teamId, attempt, promptsPerAttempt) {
  const result = await redis.eval(
    USE_PROMPT_SCRIPT,
    [roundIterationsKey(roundNumber, teamId)],
    [String(attempt), String(promptsPerAttempt)],
  );
  return Number(result);
}

/** Atomically ends the current try (by guessing or giving up). Returns the ended attempt number, or -1. */
export async function endAttempt(redis, roundNumber, teamId, { isGuess }) {
  const result = await redis.eval(
    END_ATTEMPT_SCRIPT,
    [roundIterationsKey(roundNumber, teamId)],
    [isGuess ? '1' : '0'],
  );
  return Number(result);
}

// Records that a team is done attacking this round, so the round can end early once all are.
export async function markFinished(redis, roundNumber, teamId) {
  await redis.eval(MARK_FINISHED_SCRIPT, [gameKey(), roundFinishedKey(roundNumber)], [String(roundNumber), teamId]);
}

// The stage of the next round: always '' in a duel; semis, then the final, in a tournament.
function nextStage(game) {
  if (game.mode !== 'tournament') return '';
  if (game.roundNumber === 0) return 'semis';
  if (game.stage === 'semis') return 'final';
  throw new Error('The final has been played - declare the winner under End game');
}

// Who plays whom next round: slot pairs for a duel or the semis, the two semi winners for the final.
async function buildMatches(redis, game, stage) {
  if (stage === 'final') {
    if (game.finalists.length !== 2 || game.finalists.some((id) => !id)) {
      throw new Error('Pick who advances from each drawn semifinal first');
    }
    return [game.finalists];
  }
  const teamIds = await getTeamIds(redis, game.mode);
  const needed = teamCountFor(game.mode);
  if (teamIds.length !== needed) {
    throw new Error(`Exactly ${needed} teams must be configured before starting`);
  }
  return pairUp(teamIds);
}

export async function startRound(redis, { draftDurationSec, attackDurationSec, promptsPerAttempt } = {}) {
  const game = await getGame(redis);
  if (!['lobby', 'round_ended'].includes(game.state)) {
    throw new Error(`Cannot start a round from state "${game.state}"`);
  }
  const stage = nextStage(game);
  const matches = await buildMatches(redis, game, stage);

  const roundNumber = game.roundNumber + 1;
  const draftSec = draftDurationSec || game.draftDurationSec || DEFAULT_DRAFT_SEC;
  const attackSec = attackDurationSec || game.attackDurationSec || DEFAULT_ATTACK_SEC;
  const prompts = clampPrompts(promptsPerAttempt || game.promptsPerAttempt);
  const now = Date.now();
  const draftEndsAt = now + draftSec * 1000;

  for (const teamId of matches.flat()) {
    // Start from the team's last saved defense so they don't have to rewrite it every round.
    const previous = (await redis.hgetall(teamDefenseKey(teamId))) || {};
    await redis.del(roundVaultKey(roundNumber, teamId));
    await redis.hset(roundVaultKey(roundNumber, teamId), {
      systemPrompt: encodeText(asText(previous.systemPrompt)),
      jobDescription: encodeText(asText(previous.jobDescription)),
      password: generatePassword(),
      crackedByOpponent: false,
      crackedAtIteration: '',
    });
    await redis.del(roundIterationsKey(roundNumber, teamId));
  }

  await redis.hset(roundKey(roundNumber), {
    state: 'draft',
    draftEndsAt: String(draftEndsAt),
    stage,
    matches: JSON.stringify(matches),
  });
  // Finalists carry from the semis into the final, so they're only cleared when the semis start.
  const stageFields = stage === 'final' ? {} : { finalists: '' };
  await redis.hset(gameKey(), {
    state: 'draft',
    stage,
    matches: JSON.stringify(matches),
    ...stageFields,
    finishedCount: '0',
    roundNumber: String(roundNumber),
    draftEndsAt: String(draftEndsAt),
    attackEndsAt: '',
    draftDurationSec: String(draftSec),
    attackDurationSec: String(attackSec),
    promptsPerAttempt: String(prompts),
    winnerTeamId: '',
    finalResult: '',
  });

  return getGame(redis);
}

/**
 * draft -> attack: locks in each vault's helpfulness check result and starts the attack timer.
 * Makes no AI calls - it only reads results teams already earned with "Save & test" during
 * the draft phase. A vault whose current text was never tested (or failed) is marked failed.
 * Returns true if it switched, 'checking' if it's waiting on a running check, otherwise false.
 */
export async function runDraftToAttack(redis) {
  const game = await getGame(redis);
  if (game.state !== 'draft') return false;

  // While this lock is held, vault saves are refused (see SAVE_VAULT_SCRIPT).
  const lockKey = roundTransitionLockKey(game.roundNumber);
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 30000 });
  if (!gotLock) return false; // another request is already running this transition

  try {
    const ids = game.matches.flat();
    // A "Save & test" started before the deadline still counts: hold the switch until it finishes,
    // giving up CHECK_GRACE_MS past the deadline. The next status poll retries.
    const checking = ids.length > 0 ? await redis.mget(...ids.map((id) => roundCheckingKey(game.roundNumber, id))) : [];
    if (checking.some(Boolean) && Date.now() < (game.draftEndsAt || 0) + CHECK_GRACE_MS) {
      return 'checking';
    }

    for (const id of ids) {
      const vault = await getVault(redis, game.roundNumber, id);
      const check = vault ? await getCachedUtility(redis, vault) : null;
      await redis.hset(roundVaultKey(game.roundNumber, id), {
        utilityPassed: check?.passed === true,
        utilityReason: check ? check.reason : 'This bot was never tested.',
      });
    }

    const now = Date.now();
    const attackEndsAt = now + game.attackDurationSec * 1000;
    const ok = await casUpdateGame(redis, 'draft', { state: 'attack', attackEndsAt: String(attackEndsAt) });
    if (ok) {
      await redis.hset(roundKey(game.roundNumber), { state: 'attack', attackEndsAt: String(attackEndsAt) });
    }
    return ok;
  } finally {
    await redis.del(lockKey);
  }
}

// A match's winner is the team whose vault held while the other's broke; null when both held or both broke.
function matchWinner([a, b], vaults) {
  const brokenA = isVaultBroken(vaults[a]);
  const brokenB = isVaultBroken(vaults[b]);
  if (brokenA === brokenB) return null;
  return brokenA ? b : a;
}

// Game hash updates when a round ends: semis record who advances, a duel or final with a winner ends the game.
function roundEndFields(game, results) {
  if (game.stage === 'semis') {
    return { state: 'round_ended', finalists: JSON.stringify(results.map((r) => r.winnerTeamId)) };
  }
  const winnerTeamId = results[0].winnerTeamId;
  if (!winnerTeamId) return { state: 'round_ended' };
  return { state: 'game_ended', winnerTeamId, finalResult: 'decisive' };
}

// The public view of a sealed round: match results plus every vault, now safe to reveal.
function buildRoundSummary(game, results, vaults) {
  const publicVaults = {};
  for (const [teamId, vault] of Object.entries(vaults)) {
    publicVaults[teamId] = vault
      ? {
          systemPrompt: vault.systemPrompt,
          jobDescription: vault.jobDescription,
          password: vault.password,
          crackedByOpponent: vault.crackedByOpponent,
          utilityPassed: vault.utilityPassed,
          utilityReason: vault.utilityReason,
        }
      : null;
  }
  return { roundNumber: game.roundNumber, stage: game.stage, results, vaults: publicVaults };
}

/** attack -> round_ended | game_ended: each match is won by the team whose vault held while the other's broke. */
export async function runEvaluateRound(redis) {
  const game = await getGame(redis);
  if (game.state !== 'attack') return false;

  const lockKey = `ctf:round:${game.roundNumber}:evaluate-lock`;
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 15000 });
  if (!gotLock) return false;

  try {
    const vaults = {};
    for (const id of game.matches.flat()) {
      vaults[id] = await getVault(redis, game.roundNumber, id);
    }
    const results = game.matches.map((pair) => ({ teams: pair, winnerTeamId: matchWinner(pair, vaults) }));
    const fields = roundEndFields(game, results);

    const ok = await casUpdateGame(redis, 'attack', fields);
    if (ok) {
      await redis.hset(roundKey(game.roundNumber), { state: fields.state, results: JSON.stringify(results) });
      await redis.set(roundSummaryKey(game.roundNumber), buildRoundSummary(game, results, vaults));
    }
    return ok;
  } finally {
    await redis.del(lockKey);
  }
}

/** Lazily checks and performs any transition an expired timer or finished attackers should trigger. Call at the top of every relevant handler. */
export async function ensurePhaseFresh(redis) {
  let game = await getGame(redis);
  const now = Date.now();

  if (game.state === 'draft' && game.draftEndsAt && now >= game.draftEndsAt) {
    await runDraftToAttack(redis);
    game = await getGame(redis);
  }

  if (game.state === 'attack') {
    const timeUp = Boolean(game.attackEndsAt) && now >= game.attackEndsAt;
    // Every playing team has cracked its opponent.
    const allFinished = game.finishedCount >= game.matches.flat().length;
    if (timeUp || allFinished) {
      await runEvaluateRound(redis);
      game = await getGame(redis);
    }
  }

  return game;
}
