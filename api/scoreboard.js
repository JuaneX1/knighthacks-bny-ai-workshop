import { getRedis } from '../lib/redis.js';
import { teamsKey, roundSummaryKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, sendJson } from '../lib/http.js';
import { ensurePhaseFresh, configuredTeamIds, pairUp } from '../lib/stateMachine.js';

// Polled by the projector and admin, so it reads a fixed 3 keys: the game, the teams, and one
// MGET over the sealed-round snapshots written when each round ended.
export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET']);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  // hgetall already JSON-decodes each hash value automatically - these are real objects, not strings.
  const teams = (await redis.hgetall(teamsKey())) || {};

  const summaryKeys = Array.from({ length: game.roundNumber }, (_, i) => roundSummaryKey(i + 1));
  const summaries = summaryKeys.length > 0 ? await redis.mget(...summaryKeys) : [];
  const rounds = summaries.map((summary, i) => summary || { roundNumber: i + 1, inProgress: true });

  const phaseEndsAt = game.state === 'draft' ? game.draftEndsAt : game.state === 'attack' ? game.attackEndsAt : null;

  sendJson(res, 200, {
    state: game.state,
    mode: game.mode,
    stage: game.stage,
    roundNumber: game.roundNumber,
    phaseEndsAt,
    winnerTeamId: game.winnerTeamId,
    finalResult: game.finalResult,
    matches: game.matches,
    lineup: pairUp(configuredTeamIds(teams, game.mode)),
    finalists: game.finalists,
    teams,
    rounds: rounds.reverse(),
  });
});
