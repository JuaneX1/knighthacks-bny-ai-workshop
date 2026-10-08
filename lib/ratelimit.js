import crypto from 'node:crypto';
import { rateLimitKey, llmCallsKey, llmTeamCallsKey, gameKey } from './keys.js';
import { HttpError } from './http.js';

const WINDOW_MS = 15_000;

/** Throws 429 if this team sent a message in the last 2 seconds. Otherwise marks now as their last send. */
export async function enforceRateLimit(redis, teamId) {
  const ok = await redis.set(rateLimitKey(teamId), String(Date.now()), { nx: true, px: 2000 });
  if (!ok) {
    throw new HttpError(429, 'Slow down - only one message every 2 seconds');
  }
}

// Sliding-window limiter over two sorted sets at once: the whole game (KEYS[1]) and one team
// (KEYS[2]). ARGV: now, window ms, n calls, global max, team max, unique id.
// Returns 0 when the n calls were reserved in both windows, otherwise the ms to wait.
const RESERVE_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local n = tonumber(ARGV[3])
local limits = { tonumber(ARGV[4]), tonumber(ARGV[5]) }
local wait = 0
for i = 1, 2 do
  redis.call('ZREMRANGEBYSCORE', KEYS[i], '-inf', now - window)
  local count = redis.call('ZCARD', KEYS[i])
  if count + n > limits[i] then
    if n > limits[i] then return window end
    local oldest = redis.call('ZRANGE', KEYS[i], count + n - limits[i] - 1, count + n - limits[i] - 1, 'WITHSCORES')
    local w = tonumber(oldest[2]) + window - now
    if w > wait then wait = w end
  end
end
if wait > 0 then return wait end
for i = 1, 2 do
  for j = 1, n do
    redis.call('ZADD', KEYS[i], now, ARGV[6] .. ':' .. j)
  end
  redis.call('PEXPIRE', KEYS[i], window)
end
return 0
`;

function maxCallsPerWindow() {
  const n = Number(process.env.LLM_MAX_CALLS_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

// How many teams are playing the current round (2 in a duel or final, 4 in the semis).
async function playingTeamCount(redis) {
  const matches = await redis.hget(gameKey(), 'matches');
  return Array.isArray(matches) && matches.length > 0 ? matches.flat().length : 2;
}

/**
 * Reserves `n` AI calls before making them, so the whole game never exceeds
 * LLM_MAX_CALLS_PER_MINUTE calls per WINDOW_MS (default 10 per 15s) and each team is capped at
 * an equal share of that, so no team can starve the others. Throws a friendly 429 with the wait
 * time if there's no room.
 */
export async function reserveLlmCalls(redis, teamId, n = 1) {
  const globalMax = maxCallsPerWindow();
  // At least 3 so a team can always fit one helpfulness check (which needs 3 calls).
  const teamMax = Math.min(globalMax, Math.max(3, Math.floor(globalMax / (await playingTeamCount(redis)))));
  const waitMs = Number(
    await redis.eval(
      RESERVE_SCRIPT,
      [llmCallsKey(), llmTeamCallsKey(teamId)],
      [String(Date.now()), String(WINDOW_MS), String(n), String(globalMax), String(teamMax), crypto.randomUUID()],
    ),
  );
  if (waitMs > 0) {
    const seconds = Math.max(1, Math.ceil(waitMs / 1000));
    throw new HttpError(429, `The AI needs a short break. Try again in ${seconds} seconds.`);
  }
}
