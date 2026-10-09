import { getRedis } from '../lib/redis.js';
import { roundVaultKey, roundGuessesKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from '../lib/http.js';
import {
  ensurePhaseFresh,
  requireOpponentTeamId,
  getVault,
  getIterations,
  endAttempt,
  markFinished,
  describeIterations,
} from '../lib/stateMachine.js';

// Ends the current try. Body { guess } makes a password guess; { giveUp: true } starts a fresh
// chat without guessing. Either way the next try begins with an empty conversation.
export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  if (game.state !== 'attack') {
    throw new HttpError(409, `Guessing is only available during the attack phase (currently "${game.state}")`);
  }

  const opponentTeamId = requireOpponentTeamId(game, teamId);

  const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
  if (!opponentVault) throw new HttpError(409, 'Opponent vault not ready');

  const body = await readJsonBody(req);
  const giveUp = body.giveUp === true;
  const guess = String(body.guess || '').trim();
  if (!giveUp && !guess) throw new HttpError(400, 'guess is required');

  if (opponentVault.crackedByOpponent) {
    throw new HttpError(409, 'You already cracked it - waiting for the round to resolve');
  }

  const endedAttempt = await endAttempt(redis, game.roundNumber, teamId, { isGuess: !giveUp });
  if (endedAttempt === -1) {
    throw new HttpError(409, 'Send the bot at least one message in this try first');
  }

  const correct = !giveUp && guess.toLowerCase() === opponentVault.password.toLowerCase();

  if (!giveUp) {
    await redis.rpush(roundGuessesKey(game.roundNumber, teamId), {
      iteration: endedAttempt,
      guess,
      correct,
      ts: Date.now(),
    });
  }

  if (correct) {
    await redis.hset(roundVaultKey(game.roundNumber, opponentTeamId), {
      crackedByOpponent: true,
      crackedAtIteration: String(endedAttempt),
    });
  }

  // A team is done for the round once it cracks the vault.
  if (correct) {
    await markFinished(redis, game.roundNumber, teamId);
  }

  const attack = describeIterations(await getIterations(redis, game.roundNumber, teamId), game.promptsPerAttempt);
  sendJson(res, 200, giveUp ? { correct: false, gaveUp: true, attack } : { correct, attack });
});
