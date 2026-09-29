import {
  gameKey,
  teamsKey,
  roundKey,
  roundVaultKey,
  roundIterationsKey,
} from './keys.js';
import { generatePassword } from './words.js';
import { runUtilityCheck } from './utilityCheck.js';

const DEFAULT_DRAFT_SEC = 300;
const DEFAULT_ATTACK_SEC = 300;

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

const INCR_CHAT_SCRIPT = `
local used = tonumber(redis.call('HGET', KEYS[1], 'chatUsed') or '0')
if used >= 3 then return -1 end
return redis.call('HINCRBY', KEYS[1], 'chatUsed', 1)
`;

const INCR_GUESS_SCRIPT = `
local chatUsed = tonumber(redis.call('HGET', KEYS[1], 'chatUsed') or '0')
local guessUsed = tonumber(redis.call('HGET', KEYS[1], 'guessUsed') or '0')
if guessUsed >= chatUsed or guessUsed >= 3 then return -1 end
return redis.call('HINCRBY', KEYS[1], 'guessUsed', 1)
`;

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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
    winnerTeamId: raw.winnerTeamId || null,
    finalResult: raw.finalResult || null,
  };
}

export async function getGame(redis) {
  const raw = await redis.hgetall(gameKey());
  return parseGame(raw);
}

export async function getTeamIds(redis) {
  const raw = await redis.hgetall(teamsKey());
  return Object.keys(raw || {});
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
    filterMode: raw.filterMode || 'none',
    filterRegexList: Array.isArray(raw.filterRegexList) ? raw.filterRegexList : [],
    password: raw.password || '',
    utilityPassed: raw.utilityPassed === true,
    utilityScore: toNum(raw.utilityScore, 0),
    crackedByOpponent: raw.crackedByOpponent === true,
    crackedAtIteration: raw.crackedAtIteration ? toNum(raw.crackedAtIteration) : null,
  };
}

export async function getIterations(redis, roundNumber, teamId) {
  const raw = await redis.hgetall(roundIterationsKey(roundNumber, teamId));
  return { chatUsed: toNum(raw?.chatUsed, 0), guessUsed: toNum(raw?.guessUsed, 0) };
}

async function casUpdateGame(redis, expectedState, fields) {
  const args = [expectedState];
  for (const [k, v] of Object.entries(fields)) {
    args.push(k, String(v));
  }
  const result = await redis.eval(CAS_SET_SCRIPT, [gameKey()], args);
  return Number(result) === 1;
}

/** Atomically increments the caller's chat-iteration usage. Returns the new count, or -1 if already at cap (3). */
export async function incrementChatUsed(redis, roundNumber, teamId) {
  const result = await redis.eval(INCR_CHAT_SCRIPT, [roundIterationsKey(roundNumber, teamId)], []);
  return Number(result);
}

/** Atomically increments the caller's guess usage, only if it doesn't outrun chatUsed or the cap of 3. Returns the new count, or -1. */
export async function incrementGuessUsed(redis, roundNumber, teamId) {
  const result = await redis.eval(INCR_GUESS_SCRIPT, [roundIterationsKey(roundNumber, teamId)], []);
  return Number(result);
}

export async function startRound(redis, { draftDurationSec, attackDurationSec } = {}) {
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
  const now = Date.now();
  const draftEndsAt = now + draftSec * 1000;

  for (const teamId of teamIds) {
    const password = generatePassword();
    await redis.del(roundVaultKey(roundNumber, teamId));
    await redis.hset(roundVaultKey(roundNumber, teamId), {
      systemPrompt: '',
      jobDescription: '',
      filterMode: 'none',
      filterRegexList: [],
      password,
      utilityPassed: false,
      utilityScore: '0',
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
    winnerTeamId: '',
    finalResult: '',
  });

  return getGame(redis);
}

/** draft -> attack: runs the utility check on both vaults in parallel, locks them, starts the attack timer. */
export async function runDraftToAttack(redis) {
  const game = await getGame(redis);
  if (game.state !== 'draft') return false;

  const lockKey = `ctf:round:${game.roundNumber}:transition-lock`;
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 30000 });
  if (!gotLock) return false; // another request is already running this transition

  try {
    const teamIds = await getTeamIds(redis);
    const vaults = await Promise.all(teamIds.map((id) => getVault(redis, game.roundNumber, id)));

    const results = await Promise.all(vaults.map((vault) => runUtilityCheck(vault, vault.password)));

    await Promise.all(
      teamIds.map((id, i) =>
        redis.hset(roundVaultKey(game.roundNumber, id), {
          utilityPassed: results[i].utilityPassed,
          utilityScore: String(results[i].utilityScore),
        }),
      ),
    );

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

/** attack -> round_ended | game_ended: evaluates crack/survive for both teams and decides the outcome. */
export async function runEvaluateRound(redis) {
  const game = await getGame(redis);
  if (game.state !== 'attack') return false;

  const lockKey = `ctf:round:${game.roundNumber}:evaluate-lock`;
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 15000 });
  if (!gotLock) return false;

  try {
    const teamIds = await getTeamIds(redis);
    const vaults = {};
    for (const id of teamIds) {
      vaults[id] = await getVault(redis, game.roundNumber, id);
    }

    const survived = {};
    const crackedOpponent = {};
    for (const id of teamIds) {
      const opponentId = teamIds.find((x) => x !== id);
      survived[id] = vaults[id].utilityPassed && !vaults[id].crackedByOpponent;
      crackedOpponent[id] = vaults[opponentId].crackedByOpponent;
    }

    const winners = teamIds.filter((id) => survived[id] && crackedOpponent[id]);
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

/** Lazily checks and performs any transition an expired timer or exhausted iterations should trigger. Call at the top of every relevant handler. */
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
      const teamIds = await getTeamIds(redis);
      const iterations = await Promise.all(teamIds.map((id) => getIterations(redis, game.roundNumber, id)));
      shouldEnd = teamIds.length === 2 && iterations.every((it) => it.chatUsed >= 3);
    }
    if (shouldEnd) {
      await runEvaluateRound(redis);
      game = await getGame(redis);
    }
  }

  return game;
}
