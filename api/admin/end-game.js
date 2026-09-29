import { getRedis } from '../lib/redis.js';
import { gameKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireAdmin, HttpError } from '../lib/http.js';
import { getGame, getTeamIds } from '../lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  requireAdmin(req);
  const body = await readJsonBody(req);
  const redis = getRedis();

  const game = await getGame(redis);
  if (game.state === 'game_ended') {
    return sendJson(res, 200, { ok: true, game });
  }

  const fields = { state: 'game_ended' };

  if (body.result === 'draw') {
    fields.finalResult = 'draw';
    fields.winnerTeamId = '';
  } else if (body.result) {
    const teamIds = await getTeamIds(redis);
    if (!teamIds.includes(body.result)) throw new HttpError(400, 'result must be a known teamId or "draw"');
    fields.finalResult = 'decisive';
    fields.winnerTeamId = body.result;
  } else {
    // No explicit result given - freeze whatever the game state already reflects.
    fields.finalResult = game.finalResult || 'draw';
    fields.winnerTeamId = game.winnerTeamId || '';
  }

  await redis.hset(gameKey(), fields);
  sendJson(res, 200, { ok: true, game: await getGame(redis) });
});
