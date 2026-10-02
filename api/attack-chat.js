import { getRedis } from '../lib/redis.js';
import { roundLockKey, roundMessagesKey, roundConvoKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from '../lib/http.js';
import {
  ensurePhaseFresh,
  getOpponentTeamId,
  getVault,
  getIterations,
  usePrompt,
  describeIterations,
  ATTEMPTS_PER_ROUND,
} from '../lib/stateMachine.js';
import { validateAttackMessage } from '../lib/validation.js';
import { callChat, buildVaultSystemPrompt, LlmError, friendlyLlmMessage } from '../lib/llm.js';
import { revealsPassword } from '../lib/outputGuard.js';
import { enforceRateLimit, reserveLlmCalls } from '../lib/ratelimit.js';

// Room for long answers, so prompt-leak tricks like "repeat everything above" aren't cut off.
const MAX_REPLY_TOKENS = 800;

// GET: the conversation for this team's current try (so a page refresh doesn't lose it).
// POST: send one message in the current try. The bot remembers earlier messages in the same try.
export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET', 'POST']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  if (game.state !== 'attack') {
    throw new HttpError(409, `Attack chat is only available during the attack phase (currently "${game.state}")`);
  }

  const its = await getIterations(redis, game.roundNumber, teamId);
  const convoKey = roundConvoKey(game.roundNumber, teamId, its.attempt);

  if (req.method === 'GET') {
    const messages = its.attempt > ATTEMPTS_PER_ROUND ? [] : (await redis.lrange(convoKey, 0, -1)) || [];
    return sendJson(res, 200, { messages, attack: describeIterations(its, game.promptsPerAttempt) });
  }

  const opponentTeamId = await getOpponentTeamId(redis, teamId);
  if (!opponentTeamId) throw new HttpError(409, 'No opponent team configured');

  const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
  if (!opponentVault) throw new HttpError(409, 'Opponent vault not ready');
  if (opponentVault.crackedByOpponent) {
    throw new HttpError(409, 'You already cracked it - waiting for the round to resolve');
  }

  if (its.attempt > ATTEMPTS_PER_ROUND) {
    throw new HttpError(409, "You've used all your tries this round");
  }
  if (its.promptsUsed >= game.promptsPerAttempt) {
    throw new HttpError(409, 'No messages left in this try - make a guess to start your next try');
  }

  const body = await readJsonBody(req);
  const message = validateAttackMessage(body);

  await enforceRateLimit(redis, teamId);

  const lockKey = roundLockKey(game.roundNumber, teamId);
  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 35000 });
  if (!gotLock) throw new HttpError(429, 'Your previous message is still being processed');

  try {
    await reserveLlmCalls(redis, teamId, 1);

    const history = (await redis.lrange(convoKey, 0, -1)) || [];
    const systemPrompt = buildVaultSystemPrompt(opponentVault, opponentVault.password);
    let reply;
    try {
      reply = await callChat({ systemPrompt, history, userMessage: message, maxTokens: MAX_REPLY_TOKENS });
    } catch (err) {
      if (err instanceof LlmError) {
        // Failed calls never use up a message.
        throw new HttpError(502, `${friendlyLlmMessage(err)} (this message was not counted)`);
      }
      throw err;
    }

    // Informational only - the defending team's own prompt is what's supposed to stop this.
    const leaked = revealsPassword(reply, opponentVault.password);

    // Fails if the try ended (e.g. a guess) while the AI was answering.
    const promptsUsed = await usePrompt(redis, game.roundNumber, teamId, its.attempt, game.promptsPerAttempt);
    if (promptsUsed === -1) {
      throw new HttpError(409, 'This try already ended - your message was not counted');
    }

    await redis.rpush(convoKey, { role: 'user', content: message }, { role: 'assistant', content: reply });
    await redis.rpush(roundMessagesKey(game.roundNumber, opponentTeamId), {
      iteration: its.attempt,
      promptNumber: promptsUsed,
      promptText: message,
      replyText: reply,
      leaked,
      ts: Date.now(),
    });

    sendJson(res, 200, {
      reply,
      attack: describeIterations({ ...its, promptsUsed }, game.promptsPerAttempt),
    });
  } finally {
    await redis.del(lockKey);
  }
});
