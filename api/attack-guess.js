import { getRedis } from '../lib/redis.js';
import { roundVaultKey, roundGuessesKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from '../lib/http.js';
import { ensurePhaseFresh, getOpponentTeamId, getVault, incrementGuessUsed } from '../lib/stateMachine.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  if (game.state !== 'attack') {
    throw new HttpError(409, `Guessing is only available during the attack phase (currently "${game.state}")`);
  }

  const opponentTeamId = await getOpponentTeamId(redis, teamId);
  if (!opponentTeamId) throw new HttpError(409, 'No opponent team configured');

  const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
  if (!opponentVault) throw new HttpError(409, 'Opponent vault not ready');

  const body = await readJsonBody(req);
  const guess = String(body.guess || '').trim();
  if (!guess) throw new HttpError(400, 'guess is required');

  if (opponentVault.crackedByOpponent) {
    throw new HttpError(409, 'You already cracked it - waiting for the round to resolve');
  }

  const newGuessUsed = await incrementGuessUsed(redis, game.roundNumber, teamId);
  if (newGuessUsed === -1) {
    throw new HttpError(409, 'You must send an attack prompt before guessing for that attempt, or you are out of guesses');
  }

  const correct = guess.toLowerCase() === opponentVault.password.toLowerCase();

  await redis.rpush(roundGuessesKey(game.roundNumber, teamId), {
    iteration: newGuessUsed,
    guess,
    correct,
    ts: Date.now(),
  });

  if (correct) {
    await redis.hset(roundVaultKey(game.roundNumber, opponentTeamId), {
      crackedByOpponent: true,
      crackedAtIteration: String(newGuessUsed),
    });
  }

  sendJson(res, 200, {
    correct,
    guessUsed: newGuessUsed,
    guessRemaining: Math.max(0, 3 - newGuessUsed),
  });
});
