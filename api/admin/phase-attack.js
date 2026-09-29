import { getRedis } from '../lib/redis.js';
import { withErrorHandling, methodGuard, sendJson, requireAdmin, HttpError } from '../lib/http.js';
import { getGame, runDraftToAttack } from '../lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  requireAdmin(req);
  const redis = getRedis();

  const game = await getGame(redis);
  if (game.state !== 'draft') {
    throw new HttpError(409, `Cannot start attack phase from state "${game.state}"`);
  }

  const ok = await runDraftToAttack(redis);
  if (!ok) throw new HttpError(409, 'Transition already in progress or state changed, try again');

  sendJson(res, 200, { ok: true, game: await getGame(redis) });
});
