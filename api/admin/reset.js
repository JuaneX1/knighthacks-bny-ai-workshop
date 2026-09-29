import { getRedis } from '../lib/redis.js';
import { gameKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireAdmin, HttpError } from '../lib/http.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  requireAdmin(req);
  const body = await readJsonBody(req);
  if (body.confirm !== true) {
    throw new HttpError(400, 'Pass { confirm: true } to reset - this wipes all round data');
  }

  const redis = getRedis();
  const roundKeys = await redis.keys('ctf:round:*');
  const sessionKeys = await redis.keys('ctf:activesession:*');
  const keysToDelete = [...roundKeys, ...sessionKeys];
  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete);
  }

  await redis.del(gameKey());
  await redis.hset(gameKey(), { state: 'lobby', roundNumber: '0' });

  sendJson(res, 200, { ok: true });
});
