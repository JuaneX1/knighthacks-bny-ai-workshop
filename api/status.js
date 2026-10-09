import { getRedis } from '../lib/redis.js';
import { teamsKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, sendJson, requireTeamSession } from '../lib/http.js';
import {
  ensurePhaseFresh,
  getVault,
  getIterations,
  getOpponentTeamId,
  describeIterations,
} from '../lib/stateMachine.js';
import { getCachedUtility } from '../lib/utilityCheck.js';

// After the semifinals: 'advanced', 'eliminated', or 'pending' while the admin settles a draw.
function semiAdvancement(game, teamId) {
  if (game.stage !== 'semis' || game.state !== 'round_ended') return null;
  const matchIndex = game.matches.findIndex((pair) => pair.includes(teamId));
  const finalist = game.finalists[matchIndex];
  if (!finalist) return 'pending';
  return finalist === teamId ? 'advanced' : 'eliminated';
}

// Polled every few seconds by each team, so it only reads what the current phase's page shows.
export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();

  const game = await ensurePhaseFresh(redis);
  const opponentTeamId = getOpponentTeamId(game, teamId);
  const phaseEndsAt = game.state === 'draft' ? game.draftEndsAt : game.state === 'attack' ? game.attackEndsAt : null;
  const me = await redis.hget(teamsKey(), teamId);

  const base = {
    teamId,
    teamName: me?.name || teamId,
    state: game.state,
    mode: game.mode,
    stage: game.stage,
    roundNumber: game.roundNumber,
    phaseEndsAt,
    now: Date.now(),
    winnerTeamId: game.winnerTeamId,
    finalResult: game.finalResult,
    amIWinner: game.winnerTeamId ? game.winnerTeamId === teamId : null,
    role: opponentTeamId ? 'player' : 'spectator',
    advancement: semiAdvancement(game, teamId),
  };
  if (!opponentTeamId) return sendJson(res, 200, base);

  const opponent = await redis.hget(teamsKey(), opponentTeamId);
  let myVault = null;
  let myAttack = describeIterations({ attempt: 1, promptsUsed: 0, guessUsed: 0 }, game.promptsPerAttempt);
  let iCrackedOpponent = false;
  let opponentFailedCheck = false;

  if (game.state === 'draft') {
    const vault = await getVault(redis, game.roundNumber, teamId);
    if (vault) {
      myVault = {
        systemPrompt: vault.systemPrompt,
        jobDescription: vault.jobDescription,
        crackedByOpponent: vault.crackedByOpponent,
        check: await getCachedUtility(redis, vault),
      };
    }
  }

  if (game.state === 'attack') {
    myAttack = describeIterations(await getIterations(redis, game.roundNumber, teamId), game.promptsPerAttempt);
    const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
    iCrackedOpponent = Boolean(opponentVault?.crackedByOpponent);
    opponentFailedCheck = opponentVault?.utilityPassed === false;
  }

  sendJson(res, 200, {
    ...base,
    opponentTeamId,
    opponentName: opponent?.name || opponentTeamId,
    myVault,
    myAttack,
    iCrackedOpponent,
    opponentFailedCheck,
  });
});
