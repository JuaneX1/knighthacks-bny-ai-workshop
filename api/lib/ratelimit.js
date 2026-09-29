import { rateLimitKey } from './keys.js';
import { HttpError } from './http.js';

/** Throws 429 if this team sent a message in the last 2 seconds. Otherwise marks now as their last send. */
export async function enforceRateLimit(redis, teamId) {
  const ok = await redis.set(rateLimitKey(teamId), String(Date.now()), { nx: true, px: 2000 });
  if (!ok) {
    throw new HttpError(429, 'Slow down - only one message every 2 seconds');
  }
}
