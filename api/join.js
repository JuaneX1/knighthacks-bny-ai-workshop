import { getRedis } from './lib/redis.js';
import { joinCodeKey } from './lib/keys.js';
import { signSessionToken, buildSessionCookie, activateNewSession } from './lib/session.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, HttpError } from './lib/http.js';

export default withErrorHandling(async (req, res) => {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  const code = (body.joinCode || '').trim();
  if (!code) throw new HttpError(400, 'joinCode is required');

  const redis = getRedis();
  const teamId = await redis.get(joinCodeKey(code));
  if (!teamId) throw new HttpError(401, 'Unknown join code');

  const sessionId = await activateNewSession(teamId);
  const token = signSessionToken({ teamId, sessionId });
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  sendJson(res, 200, { ok: true, teamId });
});
