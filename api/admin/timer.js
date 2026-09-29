import { getRedis } from '../lib/redis.js';
import { gameKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireAdmin, HttpError } from '../lib/http.js';
import { getGame } from '../lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  requireAdmin(req);
  const body = await readJsonBody(req);
  const redis = getRedis();

  const fields = {};
  if (body.draftDurationSec) fields.draftDurationSec = String(body.draftDurationSec);
  if (body.attackDurationSec) fields.attackDurationSec = String(body.attackDurationSec);
  if (Object.keys(fields).length === 0) throw new HttpError(400, 'Provide draftDurationSec and/or attackDurationSec');

  await redis.hset(gameKey(), fields);

  // If a phase is currently running, optionally extend/shorten its live end time too.
  const game = await getGame(redis);
  if (body.extendCurrentPhase) {
    if (game.state === 'draft' && body.draftDurationSec) {
      const newEnd = Date.now() + Number(body.draftDurationSec) * 1000;
      await redis.hset(gameKey(), { draftEndsAt: String(newEnd) });
    }
    if (game.state === 'attack' && body.attackDurationSec) {
      const newEnd = Date.now() + Number(body.attackDurationSec) * 1000;
      await redis.hset(gameKey(), { attackEndsAt: String(newEnd) });
    }
  }

  sendJson(res, 200, { ok: true, game: await getGame(redis) });
});
