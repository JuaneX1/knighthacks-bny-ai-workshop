import { getRedis } from './lib/redis.js';
import { roundVaultKey } from './lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireTeamSession, HttpError } from './lib/http.js';
import { ensurePhaseFresh, getVault } from './lib/stateMachine.js';
import { validateVaultInput } from './lib/validation.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['GET', 'PUT']);
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
    return sendJson(res, 200, { vault: safe });
  }

  if (game.state !== 'draft') {
    throw new HttpError(409, 'Vault can only be edited during the draft phase');
  }

  const body = await readJsonBody(req);
  const clean = validateVaultInput(body);

  await redis.hset(roundVaultKey(game.roundNumber, teamId), {
    systemPrompt: clean.systemPrompt,
    jobDescription: clean.jobDescription,
    filterMode: clean.filterMode,
    filterRegexList: clean.filterRegexList,
  });

  sendJson(res, 200, { ok: true });
});
