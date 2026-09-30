import { getRedis } from '../lib/redis.js';
import { withErrorHandling, methodGuard, sendJson, requireTeamSession } from '../lib/http.js';
import {
  ensurePhaseFresh,
  getVault,
  getIterations,
  getOpponentTeamId,
  describeIterations,
} from '../lib/stateMachine.js';
import { getCachedUtility } from '../lib/utilityCheck.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();

  const game = await ensurePhaseFresh(redis);
  const opponentTeamId = await getOpponentTeamId(redis, teamId);

  let myVault = null;
  let myAttack = describeIterations({ attempt: 1, promptsUsed: 0, guessUsed: 0 }, game.promptsPerAttempt);
  let iCrackedOpponent = false;
  let opponentFailedCheck = false;

  if (game.roundNumber > 0) {
    const vault = await getVault(redis, game.roundNumber, teamId);
    if (vault) {
      // During the draft phase, show the test result for the saved text (null = not tested yet).
      // Once the attack phase starts, the locked-in result is what counts.
      const check =
        vault.utilityPassed === null
          ? await getCachedUtility(redis, vault)
          : { passed: vault.utilityPassed, reason: vault.utilityReason };
      myVault = {
        systemPrompt: vault.systemPrompt,
        jobDescription: vault.jobDescription,
        crackedByOpponent: vault.crackedByOpponent,
        check,
      };
    }
    myAttack = describeIterations(await getIterations(redis, game.roundNumber, teamId), game.promptsPerAttempt);

    if (opponentTeamId) {
      const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
      iCrackedOpponent = Boolean(opponentVault?.crackedByOpponent);
      opponentFailedCheck = opponentVault?.utilityPassed === false;
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
    myAttack,
    iCrackedOpponent,
    opponentFailedCheck,
  });
});
