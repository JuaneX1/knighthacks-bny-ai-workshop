import { getRedis } from '../lib/redis.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from '../lib/http.js';
import { ensurePhaseFresh } from '../lib/stateMachine.js';
import { validateVaultInput, validateAttackMessage } from '../lib/validation.js';
import { callChat, buildVaultSystemPrompt, LlmError, friendlyLlmMessage } from '../lib/llm.js';
import { revealsPassword } from '../lib/outputGuard.js';
import { reserveLlmCalls } from '../lib/ratelimit.js';

const DUMMY_PASSWORD = 'sample-password';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  if (game.state !== 'draft') {
    throw new HttpError(409, 'Test chat is only available during the draft phase');
  }

  const body = await readJsonBody(req);
  const vault = validateVaultInput(body);
  const message = validateAttackMessage(body);

  await reserveLlmCalls(redis, teamId, 1);

  const systemPrompt = buildVaultSystemPrompt(vault, DUMMY_PASSWORD);

  try {
    const reply = await callChat({ systemPrompt, userMessage: message, maxTokens: 800 });
    // Defenders see when their own prompt let the (fake) password slip, so they know to tighten it.
    const leaked = revealsPassword(reply, DUMMY_PASSWORD);
    sendJson(res, 200, { reply, leaked });
  } catch (err) {
    if (err instanceof LlmError) {
      throw new HttpError(502, friendlyLlmMessage(err));
    }
    throw err;
  }
});
