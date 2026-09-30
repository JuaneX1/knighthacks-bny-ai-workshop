import {
  gameKey,
  teamsKey,
  TEAM_IDS,
  teamDefenseKey,
  roundKey,
  roundVaultKey,
  roundIterationsKey,
} from './keys.js';
import { generatePassword } from './words.js';
import { getCachedUtility } from './utilityCheck.js';

const DEFAULT_DRAFT_SEC = 300;
const DEFAULT_ATTACK_SEC = 600;
const DEFAULT_PROMPTS_PER_ATTEMPT = 8;
export const MAX_PROMPTS_PER_ATTEMPT = 20;
// Each round, a team gets this many tries. A try is a short conversation with the opponent's
// vault (up to promptsPerAttempt messages, with memory) that ends with one password guess.
export const ATTEMPTS_PER_ROUND = 3;

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

// ARGV: expected attempt, max attempts, prompts per attempt. Returns the new promptsUsed, or -1.
const USE_PROMPT_SCRIPT = `
local attempt = tonumber(redis.call('HGET', KEYS[1], 'attempt') or '1')
local used = tonumber(redis.call('HGET', KEYS[1], 'promptsUsed') or '0')
if attempt ~= tonumber(ARGV[1]) or attempt > tonumber(ARGV[2]) or used >= tonumber(ARGV[3]) then return -1 end
redis.call('HSET', KEYS[1], 'attempt', attempt)
return redis.call('HINCRBY', KEYS[1], 'promptsUsed', 1)
`;

// ARGV: max attempts, '1' if this is a guess (vs. giving up). Ends the current try and moves to
// the next one. Returns the attempt number that was ended, or -1 if there's no try to end
// (all used up, or no message sent yet in this try).
const END_ATTEMPT_SCRIPT = `
local attempt = tonumber(redis.call('HGET', KEYS[1], 'attempt') or '1')
local used = tonumber(redis.call('HGET', KEYS[1], 'promptsUsed') or '0')
if attempt > tonumber(ARGV[1]) or used == 0 then return -1 end
if ARGV[2] == '1' then redis.call('HINCRBY', KEYS[1], 'guessUsed', 1) end
redis.call('HSET', KEYS[1], 'attempt', attempt + 1, 'promptsUsed', 0)
return attempt
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
      roundNumber: 0,
      draftEndsAt: null,
      attackEndsAt: null,
      draftDurationSec: DEFAULT_DRAFT_SEC,
      attackDurationSec: DEFAULT_ATTACK_SEC,
      promptsPerAttempt: DEFAULT_PROMPTS_PER_ATTEMPT,
      winnerTeamId: null,
      finalResult: null,
    };
  }
  return {
    state: raw.state || 'lobby',
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

/** Configured team ids, always in fixed order. Ignores any stray entries left in the hash. */
export async function getTeamIds(redis) {
  const raw = (await redis.hgetall(teamsKey())) || {};
  return TEAM_IDS.filter((id) => raw[id]);
}

export async function getOpponentTeamId(redis, teamId) {
  const ids = await getTeamIds(redis);
  return ids.find((id) => id !== teamId) || null;
}

export async function getVault(redis, roundNumber, teamId) {
  const raw = await redis.hgetall(roundVaultKey(roundNumber, teamId));
  if (!raw || Object.keys(raw).length === 0) return null;
  // Note: the Upstash SDK JSON-parses hash values automatically on read (and JSON-stringifies
  // non-string values on write), so booleans/arrays come back as real booleans/arrays already -
  // do not JSON.parse or string-compare ('1'/'0') here, that would double-decode or always miss.
  return {
    systemPrompt: raw.systemPrompt || '',
    jobDescription: raw.jobDescription || '',
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
  const done = its.attempt > ATTEMPTS_PER_ROUND;
  return {
    attempt: Math.min(its.attempt, ATTEMPTS_PER_ROUND),
    attemptsTotal: ATTEMPTS_PER_ROUND,
    attemptsLeft: Math.max(0, ATTEMPTS_PER_ROUND - its.attempt + 1),
    promptsUsed: done ? promptsPerAttempt : its.promptsUsed,
    promptsPerAttempt,
    promptsLeft: done ? 0 : Math.max(0, promptsPerAttempt - its.promptsUsed),
    canGuess: !done && its.promptsUsed > 0,
    done,
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
    [String(attempt), String(ATTEMPTS_PER_ROUND), String(promptsPerAttempt)],
  );
  return Number(result);
}

/** Atomically ends the current try (by guessing or giving up). Returns the ended attempt number, or -1. */
export async function endAttempt(redis, roundNumber, teamId, { isGuess }) {
  const result = await redis.eval(
    END_ATTEMPT_SCRIPT,
    [roundIterationsKey(roundNumber, teamId)],
    [String(ATTEMPTS_PER_ROUND), isGuess ? '1' : '0'],
  );
  return Number(result);
}

export async function startRound(redis, { draftDurationSec, attackDurationSec, promptsPerAttempt } = {}) {
  const game = await getGame(redis);
  if (!['lobby', 'round_ended'].includes(game.state)) {
    throw new Error(`Cannot start a round from state "${game.state}"`);
  }
  const teamIds = await getTeamIds(redis);
  if (teamIds.length !== 2) {
    throw new Error('Exactly 2 teams must be configured before starting a round');
  }

  const roundNumber = game.roundNumber + 1;
  const draftSec = draftDurationSec || game.draftDurationSec || DEFAULT_DRAFT_SEC;
  const attackSec = attackDurationSec || game.attackDurationSec || DEFAULT_ATTACK_SEC;
  const prompts = clampPrompts(promptsPerAttempt || game.promptsPerAttempt);
  const now = Date.now();
  const draftEndsAt = now + draftSec * 1000;

  for (const teamId of teamIds) {
    // Start from the team's last saved defense so they don't have to rewrite it every round.
    const previous = (await redis.hgetall(teamDefenseKey(teamId))) || {};
    await redis.del(roundVaultKey(roundNumber, teamId));
    await redis.hset(roundVaultKey(roundNumber, teamId), {
      systemPrompt: previous.systemPrompt || '',
      jobDescription: previous.jobDescription || '',
      password: generatePassword(),
      crackedByOpponent: false,
      crackedAtIteration: '',
    });
    await redis.del(roundIterationsKey(roundNumber, teamId));
  }

  await redis.hset(roundKey(roundNumber), { state: 'draft', draftEndsAt: String(draftEndsAt) });
  await redis.hset(gameKey(), {
    state: 'draft',
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
 */
export async function runDraftToAttack(redis) {
  const game = await getGame(redis);
  if (game.state !== 'draft') return false;

  const lockKey = `ctf:round:${game.roundNumber}:transition-lock`;
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 30000 });
  if (!gotLock) return false; // another request is already running this transition

  try {
    const teamIds = await getTeamIds(redis);
    for (const id of teamIds) {
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

/** attack -> round_ended | game_ended: a team wins if its own vault held up and the opponent's broke. */
export async function runEvaluateRound(redis) {
  const game = await getGame(redis);
  if (game.state !== 'attack') return false;

  const lockKey = `ctf:round:${game.roundNumber}:evaluate-lock`;
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 15000 });
  if (!gotLock) return false;

  try {
    const teamIds = await getTeamIds(redis);
    const broken = {};
    for (const id of teamIds) {
      broken[id] = isVaultBroken(await getVault(redis, game.roundNumber, id));
    }

    const winners = teamIds.filter((id) => !broken[id] && broken[teamIds.find((x) => x !== id)]);
    const gameOver = winners.length === 1;
    const nextState = gameOver ? 'game_ended' : 'round_ended';

    const fields = { state: nextState };
    if (gameOver) {
      fields.winnerTeamId = winners[0];
      fields.finalResult = 'decisive';
    }

    const ok = await casUpdateGame(redis, 'attack', fields);
    if (ok) {
      await redis.hset(roundKey(game.roundNumber), {
        state: nextState,
        outcome: gameOver ? 'decisive' : 'draw',
        winnerTeamId: gameOver ? winners[0] : '',
      });
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
    let shouldEnd = Boolean(game.attackEndsAt) && now >= game.attackEndsAt;
    if (!shouldEnd) {
      // End early once both teams are finished attacking: out of tries, or already cracked it.
      const teamIds = await getTeamIds(redis);
      const finished = await Promise.all(
        teamIds.map(async (id) => {
          const its = await getIterations(redis, game.roundNumber, id);
          if (its.attempt > ATTEMPTS_PER_ROUND) return true;
          const opponentVault = await getVault(redis, game.roundNumber, teamIds.find((x) => x !== id));
          return Boolean(opponentVault?.crackedByOpponent);
        }),
      );
      shouldEnd = teamIds.length === 2 && finished.every(Boolean);
    }
    if (shouldEnd) {
      await runEvaluateRound(redis);
      game = await getGame(redis);
    }
  }

  return game;
}
