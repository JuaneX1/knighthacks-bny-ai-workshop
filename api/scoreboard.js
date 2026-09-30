import { getRedis } from './lib/redis.js';
import { roundKey, teamsKey } from './lib/keys.js';
import { withErrorHandling, methodGuard, sendJson } from './lib/http.js';
import { ensurePhaseFresh, getVault, getTeamIds } from './lib/stateMachine.js';

const SEALED_STATES = ['round_ended', 'game_ended'];

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET']);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  // hgetall already JSON-decodes each hash value automatically - these are real objects, not strings.
  const teamsRaw = await redis.hgetall(teamsKey());
  const teams = teamsRaw || {};
  const teamIds = await getTeamIds(redis);

  const rounds = [];
  for (let n = 1; n <= game.roundNumber; n++) {
    const meta = await redis.hgetall(roundKey(n));
    const sealed = meta && SEALED_STATES.includes(meta.state);

    if (!sealed) {
      rounds.push({ roundNumber: n, state: meta?.state || 'in_progress' });
      continue;
    }

    const vaults = {};
    for (const teamId of teamIds) {
      const vault = await getVault(redis, n, teamId);
      vaults[teamId] = vault
        ? {
            systemPrompt: vault.systemPrompt,
            jobDescription: vault.jobDescription,
            password: vault.password,
            crackedByOpponent: vault.crackedByOpponent,
          }
        : null;
    }

    rounds.push({
      roundNumber: n,
      state: meta.state,
      outcome: meta.outcome,
      winnerTeamId: meta.winnerTeamId || null,
      vaults,
    });
  }

  const phaseEndsAt = game.state === 'draft' ? game.draftEndsAt : game.state === 'attack' ? game.attackEndsAt : null;

  sendJson(res, 200, {
    state: game.state,
    roundNumber: game.roundNumber,
    phaseEndsAt,
    winnerTeamId: game.winnerTeamId,
    finalResult: game.finalResult,
    teams,
    rounds: rounds.reverse(),
  });
});
