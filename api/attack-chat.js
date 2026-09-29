import { getRedis } from './lib/redis.js';
import { roundLockKey, roundMessagesKey } from './lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from './lib/http.js';
import { ensurePhaseFresh, getOpponentTeamId, getVault, getIterations, incrementChatUsed } from './lib/stateMachine.js';
import { validateAttackMessage } from './lib/validation.js';
import { callChat, buildVaultSystemPrompt, LlmError, friendlyLlmMessage } from './lib/llm.js';
import { applyFilter } from './lib/filter.js';
import { enforceRateLimit } from './lib/ratelimit.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  if (game.state !== 'attack') {
    throw new HttpError(409, `Attack chat is only available during the attack phase (currently "${game.state}")`);
  }

  const opponentTeamId = await getOpponentTeamId(redis, teamId);
  if (!opponentTeamId) throw new HttpError(409, 'No opponent team configured');

  const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
  if (!opponentVault) throw new HttpError(409, 'Opponent vault not ready');
  if (opponentVault.crackedByOpponent) {
    throw new HttpError(409, 'You already cracked it - waiting for the round to resolve');
  }

  const myIterations = await getIterations(redis, game.roundNumber, teamId);
  if (myIterations.chatUsed >= 3) {
    throw new HttpError(409, 'No attack attempts remaining this round');
  }

  const body = await readJsonBody(req);
  const message = validateAttackMessage(body);

  await enforceRateLimit(redis, teamId);

  const lockKey = roundLockKey(game.roundNumber, teamId);
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 15000 });
  if (!gotLock) throw new HttpError(429, 'Your previous message is still being processed');

  try {
    const systemPrompt = buildVaultSystemPrompt(opponentVault, opponentVault.password);
    let reply;
    try {
      const raw = await callChat({ systemPrompt, userMessage: message });
      reply = await applyFilter(opponentVault, raw, opponentVault.password);
    } catch (err) {
      if (err instanceof LlmError) {
        // Failed calls never consume an attempt.
        throw new HttpError(502, `${friendlyLlmMessage(err)} (this attempt was not counted)`);
      }
      throw err;
    }

    const newChatUsed = await incrementChatUsed(redis, game.roundNumber, teamId);
    if (newChatUsed === -1) {
      throw new HttpError(409, 'No attack attempts remaining this round');
    }

    await redis.rpush(roundMessagesKey(game.roundNumber, opponentTeamId), {
      iteration: newChatUsed,
      promptText: message,
      replyText: reply,
      ts: Date.now(),
    });

    sendJson(res, 200, {
      reply,
      chatUsed: newChatUsed,
      chatRemaining: Math.max(0, 3 - newChatUsed),
    });
  } finally {
    await redis.del(lockKey);
  }
});
