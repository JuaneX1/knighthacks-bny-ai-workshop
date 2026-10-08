import { getRedis } from '../lib/redis.js';
import { roundVaultKey, teamDefenseKey, checkCooldownKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from '../lib/http.js';
import { ensurePhaseFresh, getVault, requireOpponentTeamId } from '../lib/stateMachine.js';
import { validateVaultInput } from '../lib/validation.js';
import { getCachedUtility, runUtilityCheck } from '../lib/utilityCheck.js';
import { LlmError, friendlyLlmMessage } from '../lib/llm.js';

const CHECK_COOLDOWN_MS = 30_000;

// GET: this team's vault for the current round.
// PUT: save it. POST: save it, then run the helpfulness check ("Save & test").
export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET', 'PUT', 'POST']);
  const { teamId } = await requireTeamSession(req);
  const redis = getRedis();
  const game = await ensurePhaseFresh(redis);

  if (game.roundNumber === 0) {
    throw new HttpError(409, 'No round has started yet');
  }

  if (req.method === 'GET') {
    const vault = await getVault(redis, game.roundNumber, teamId);
    if (!vault) throw new HttpError(404, 'No vault for this round yet');
    const { password, ...safe } = vault;
    return sendJson(res, 200, { vault: safe, check: await getCachedUtility(redis, vault) });
  }

  if (game.state !== 'draft') {
    throw new HttpError(409, 'You can only change your bot while the Defend phase is on');
  }
  requireOpponentTeamId(game, teamId);

  const body = await readJsonBody(req);
  const clean = validateVaultInput(body);

  await redis.hset(roundVaultKey(game.roundNumber, teamId), clean);
  // Remember the latest defense so it's pre-filled next round.
  await redis.hset(teamDefenseKey(teamId), clean);

  if (req.method === 'PUT') {
    return sendJson(res, 200, { ok: true, check: await getCachedUtility(redis, clean) });
  }

  if (!clean.jobDescription.trim()) {
    throw new HttpError(400, "Saved! Now give your bot a job (like \"pizza shop helper\") so we can test it.");
  }

  // Same text as a vault that was already tested: reuse the result, no AI calls.
  const cached = await getCachedUtility(redis, clean);
  if (cached) return sendJson(res, 200, { ok: true, check: cached });

  const cooldownKey = checkCooldownKey(teamId);
  const gotSlot = await redis.set(cooldownKey, '1', { nx: true, px: CHECK_COOLDOWN_MS });
  if (!gotSlot) {
    const waitSec = Math.max(1, Math.ceil((await redis.pttl(cooldownKey)) / 1000));
    throw new HttpError(429, `Saved! You can test again in ${waitSec} seconds.`);
  }

  try {
    const check = await runUtilityCheck(redis, teamId, clean);
    sendJson(res, 200, { ok: true, check });
  } catch (err) {
    // The test didn't run, so don't make the team wait out the cooldown.
    await redis.del(cooldownKey);
    if (err instanceof LlmError) {
      throw new HttpError(502, `Saved, but the test couldn't run. ${friendlyLlmMessage(err)}`);
    }
    if (err instanceof HttpError) throw new HttpError(err.status, `Saved! ${err.message}`);
    throw err;
  }
});
