import { getRedis } from '../lib/redis.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireAdmin, HttpError } from '../lib/http.js';
import { startRound } from '../lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  requireAdmin(req);
  const body = await readJsonBody(req);
  const redis = getRedis();

  try {
    const game = await startRound(redis, {
      draftDurationSec: body.draftDurationSec,
      attackDurationSec: body.attackDurationSec,
    });
    sendJson(res, 200, { ok: true, game });
  } catch (err) {
    throw new HttpError(409, err.message);
  }
});
