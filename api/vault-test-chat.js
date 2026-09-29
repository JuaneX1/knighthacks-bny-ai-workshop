import { getRedis } from './lib/redis.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from './lib/http.js';
import { ensurePhaseFresh } from './lib/stateMachine.js';
import { validateVaultInput, validateAttackMessage } from './lib/validation.js';
import { callChat, buildVaultSystemPrompt, LlmError, friendlyLlmMessage } from './lib/llm.js';
import { applyFilter } from './lib/filter.js';

const DUMMY_PASSWORD = 'sample-password';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  await requireTeamSession(req);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  if (game.state !== 'draft') {
    throw new HttpError(409, 'Test chat is only available during the draft phase');
  }

  const body = await readJsonBody(req);
  const vault = validateVaultInput(body);
  const message = validateAttackMessage(body);

  const systemPrompt = buildVaultSystemPrompt(vault, DUMMY_PASSWORD);

  try {
    const raw = await callChat({ systemPrompt, userMessage: message });
    const filtered = await applyFilter(vault, raw, DUMMY_PASSWORD);
    sendJson(res, 200, { reply: filtered });
  } catch (err) {
    if (err instanceof LlmError) {
      throw new HttpError(502, friendlyLlmMessage(err));
    }
    throw err;
  }
});
