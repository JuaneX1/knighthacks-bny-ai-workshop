import { getRedis } from '../lib/redis.js';
import { roundKey, roundMessagesKey, roundGuessesKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, sendJson, requireAdmin } from '../lib/http.js';
import { getGame, getTeamIds, getVault } from '../lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET']);
  requireAdmin(req);
  const redis = getRedis();

  const game = await getGame(redis);
  const teamIds = await getTeamIds(redis);
  const rounds = [];

  for (let n = 1; n <= game.roundNumber; n++) {
    const meta = await redis.hgetall(roundKey(n));
    const teams = {};
    for (const teamId of teamIds) {
      const vault = await getVault(redis, n, teamId);
      const messages = (await redis.lrange(roundMessagesKey(n, teamId), 0, -1)) || [];
      const guesses = (await redis.lrange(roundGuessesKey(n, teamId), 0, -1)) || [];
      teams[teamId] = { vault, messages, guesses };
    }
    rounds.push({ roundNumber: n, state: meta?.state, outcome: meta?.outcome, winnerTeamId: meta?.winnerTeamId, teams });
  }

  sendJson(res, 200, { game, rounds });
});
