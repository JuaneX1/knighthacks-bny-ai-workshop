import crypto from 'node:crypto';
import { getRedis } from './redis.js';
import { activeSessionKey } from './keys.js';

const COOKIE_NAME = 'ctf_session';
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours, generous for a single event day

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function hmac(payloadB64) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payloadB64).digest('hex');
}

export function signSessionToken({ teamId, sessionId }) {
  const payload = JSON.stringify({ teamId, sessionId, iat: Date.now() });
  const payloadB64 = base64url(payload);
  const sig = hmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

function parseToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expectedSig = hmac(payloadB64);
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.teamId || !payload.sessionId || !payload.iat) return null;
  if (Date.now() - payload.iat > MAX_AGE_MS) return null;
  return payload;
}

/** Verifies HMAC + that this is still the team's currently-active device session. */
export async function verifySessionToken(token) {
  const payload = parseToken(token);
  if (!payload) return null;
  const redis = getRedis();
  const activeSessionId = await redis.get(activeSessionKey(payload.teamId));
  if (!activeSessionId || activeSessionId !== payload.sessionId) return null;
  return { teamId: payload.teamId };
}

export function buildSessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}${secure}`;
}

export function parseCookies(req) {
  const header = req.headers?.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function getSessionTokenFromRequest(req) {
  return parseCookies(req)[COOKIE_NAME];
}

export async function activateNewSession(teamId) {
  const sessionId = crypto.randomUUID();
  const redis = getRedis();
  await redis.set(activeSessionKey(teamId), sessionId);
  return sessionId;
}

export function verifyAdminToken(req) {
  const header = req.headers?.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  const expected = process.env.ADMIN_TOKEN || '';
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (tokenBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(tokenBuf, expectedBuf);
}
