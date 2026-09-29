import { getRedis } from '../lib/redis.js';
import { withErrorHandling, methodGuard, sendJson, requireAdmin, HttpError } from '../lib/http.js';
import { getGame, runEvaluateRound } from '../lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  requireAdmin(req);
  const redis = getRedis();

  const game = await getGame(redis);
  if (game.state !== 'attack') {
    throw new HttpError(409, `Cannot end attack phase from state "${game.state}"`);
  }

  const ok = await runEvaluateRound(redis);
  if (!ok) throw new HttpError(409, 'Transition already in progress or state changed, try again');

  sendJson(res, 200, { ok: true, game: await getGame(redis) });
});
