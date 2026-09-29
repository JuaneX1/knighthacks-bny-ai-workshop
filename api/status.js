import { getRedis } from './lib/redis.js';
import { withErrorHandling, methodGuard, sendJson, requireTeamSession } from './lib/http.js';
import { ensurePhaseFresh, getVault, getIterations, getOpponentTeamId } from './lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();

  const game = await ensurePhaseFresh(redis);
  const opponentTeamId = await getOpponentTeamId(redis, teamId);

  let myVault = null;
  let myIterations = { chatUsed: 0, chatRemaining: 3, guessUsed: 0, guessRemaining: 3 };
  let iCrackedOpponent = false;

  if (game.roundNumber > 0) {
    const vault = await getVault(redis, game.roundNumber, teamId);
    if (vault) {
      myVault = {
        systemPrompt: vault.systemPrompt,
        jobDescription: vault.jobDescription,
        filterMode: vault.filterMode,
        filterRegexList: vault.filterRegexList,
        utilityPassed: vault.utilityPassed,
        utilityScore: vault.utilityScore,
        crackedByOpponent: vault.crackedByOpponent,
      };
    }
    const its = await getIterations(redis, game.roundNumber, teamId);
    myIterations = {
      chatUsed: its.chatUsed,
      chatRemaining: Math.max(0, 3 - its.chatUsed),
      guessUsed: its.guessUsed,
      guessRemaining: Math.max(0, 3 - its.guessUsed),
    };

    if (opponentTeamId) {
      const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
      iCrackedOpponent = Boolean(opponentVault?.crackedByOpponent);
    }
  }

  const phaseEndsAt = game.state === 'draft' ? game.draftEndsAt : game.state === 'attack' ? game.attackEndsAt : null;

  sendJson(res, 200, {
    state: game.state,
    roundNumber: game.roundNumber,
    phaseEndsAt,
    now: Date.now(),
    winnerTeamId: game.winnerTeamId,
    finalResult: game.finalResult,
    amIWinner: game.winnerTeamId ? game.winnerTeamId === teamId : null,
    myVault,
    myIterations,
    iCrackedOpponent,
  });
});
