import { getSessionTokenFromRequest, verifySessionToken, verifyAdminToken } from './session.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, data) {
  res.status(status).json(data);
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      throw new HttpError(400, 'Invalid JSON body');
    }
  }
  return {};
}

export function methodGuard(req, methods) {
  if (!methods.includes(req.method)) {
    throw new HttpError(405, `Method ${req.method} not allowed`);
  }
}

/** Resolves the caller's teamId from the verified session cookie, or throws 401. */
export async function requireTeamSession(req) {
  const token = getSessionTokenFromRequest(req);
  const session = await verifySessionToken(token);
  if (!session) {
    throw new HttpError(401, 'Not signed in, or signed in from another device');
  }
  return session; // { teamId }
}

export function requireAdmin(req) {
  if (!verifyAdminToken(req)) {
    throw new HttpError(401, 'Invalid admin token');
  }
}

/** Wraps a Vercel serverless handler with uniform error handling. */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message });
      } else {
        console.error(err);
        sendJson(res, 500, { error: 'Internal server error' });
      }
    }
  };
}
