import { getRedis } from '../lib/redis.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from '../lib/http.js';
import { ensurePhaseFresh } from '../lib/stateMachine.js';
import { validateVaultInput, validateAttackMessage } from '../lib/validation.js';
import { callChat, buildVaultSystemPrompt, LlmError, friendlyLlmMessage } from '../lib/llm.js';
import { revealsPassword, deflectReply } from '../lib/outputGuard.js';
import { getCachedUtility } from '../lib/utilityCheck.js';
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
    let reply = await callChat({ systemPrompt, userMessage: message, maxTokens: 800 });
    const guarded = revealsPassword(reply, DUMMY_PASSWORD);
    if (guarded) {
      reply = await deflectReply(redis, {
        teamId,
        userMessage: message,
        jobDescription: vault.jobDescription,
        validVault: (await getCachedUtility(redis, vault))?.passed === true,
        password: DUMMY_PASSWORD,
      });
    }
    // Defenders see when the guard caught a leak, so they know their rules let it slip.
    sendJson(res, 200, { reply, guarded });
  } catch (err) {
    if (err instanceof LlmError) {
      throw new HttpError(502, friendlyLlmMessage(err));
    }
    throw err;
  }
});
