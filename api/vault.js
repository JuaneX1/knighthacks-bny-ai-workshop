import { getRedis } from '../lib/redis.js';
import { checkCooldownKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from '../lib/http.js';
import { ensurePhaseFresh, getVault, requireOpponentTeamId, saveVault, clearChecking } from '../lib/stateMachine.js';
import { validateVaultInput } from '../lib/validation.js';
import { getCachedUtility, runUtilityCheck } from '../lib/utilityCheck.js';
import { LlmError, friendlyLlmMessage } from '../lib/llm.js';

const CHECK_COOLDOWN_MS = 30_000;
// How long the "check running" marker lives if it's never cleared - longer than the check's time budget.
const CHECKING_TTL_MS = 30_000;

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

  // Decide whether a check will run before saving, so the save can mark it as running in the same
  // step - otherwise the phase could switch between the save and the check starting.
  const wantsCheck = req.method === 'POST' && Boolean(clean.jobDescription.trim());
  // Same text as a vault that was already tested: reuse the result, no AI calls.
  const cached = wantsCheck ? await getCachedUtility(redis, clean) : null;
  const cooldownKey = checkCooldownKey(teamId);
  const gotSlot =
    wantsCheck && !cached ? Boolean(await redis.set(cooldownKey, '1', { nx: true, px: CHECK_COOLDOWN_MS })) : false;

  const saved = await saveVault(redis, game.roundNumber, teamId, clean, { checkingTtlMs: gotSlot ? CHECKING_TTL_MS : 0 });
  if (saved !== 'saved') {
    if (gotSlot) await redis.del(cooldownKey);
    throw new HttpError(
      409,
      saved === 'ending'
        ? "Time's up - the Attack phase is starting. Your last saved version is the one that counts."
        : 'The Defend phase is over - your last saved version is the one that counts.',
    );
  }

  if (req.method === 'PUT') {
    return sendJson(res, 200, { ok: true, check: await getCachedUtility(redis, clean) });
  }

  if (!wantsCheck) {
    throw new HttpError(400, "Saved! Now give your bot a job (like \"pizza shop helper\") so we can test it.");
  }

  if (cached) return sendJson(res, 200, { ok: true, check: cached });

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
  } finally {
    await clearChecking(redis, game.roundNumber, teamId);
  }
});
