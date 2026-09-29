import { getRedis } from '../lib/redis.js';
import { teamsKey, joinCodeKey } from '../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireAdmin, HttpError } from '../lib/http.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST', 'GET']);
  requireAdmin(req);
  const redis = getRedis();

  if (req.method === 'GET') {
    // hgetall already JSON-decodes each hash value automatically - these are real objects, not strings.
    const raw = await redis.hgetall(teamsKey());
    const teams = Object.entries(raw || {}).map(([teamId, info]) => ({ teamId, ...info }));
    return sendJson(res, 200, { teams });
  }

  const body = await readJsonBody(req);
  const teams = Array.isArray(body.teams) ? body.teams : [];
  if (teams.length === 0) throw new HttpError(400, 'teams array is required');

  for (const t of teams) {
    if (!t.teamId || !t.name || !t.joinCode) {
      throw new HttpError(400, 'Each team needs teamId, name, and joinCode');
    }
    await redis.hset(teamsKey(), { [t.teamId]: JSON.stringify({ name: t.name, joinCode: t.joinCode }) });
    await redis.set(joinCodeKey(t.joinCode), t.teamId);
  }

  sendJson(res, 200, { ok: true });
});
