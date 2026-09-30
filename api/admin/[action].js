import { getRedis } from '../../lib/redis.js';
import { gameKey, teamsKey, joinCodeKey, roundKey, roundMessagesKey, roundGuessesKey } from '../../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireAdmin, HttpError } from '../../lib/http.js';
import { getGame, getTeamIds, getVault, startRound, runDraftToAttack, runEvaluateRound } from '../../lib/stateMachine.js';

// Every admin action used to be its own file under /api/admin. Consolidated into one
// dynamic route (Vercel's [action].js path-segment convention) so it counts as a single
// serverless function instead of eight - the Hobby plan caps a deployment at 12 total.
// URLs are unchanged: /api/admin/teams, /api/admin/round-start, etc. all still work,
// Vercel just routes them all here with req.query.action set to the matched segment.

async function handleTeams(req, res) {
  methodGuard(req, ['POST', 'GET']);
  const redis = getRedis();

  if (req.method === 'GET') {
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
}

async function handleRoundStart(req, res) {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  const redis = getRedis();

  try {
    const game = await startRound(redis, {
      draftDurationSec: body.draftDurationSec,
      attackDurationSec: body.attackDurationSec,
    });
    sendJson(res, 200, { ok: true, game });
  } catch (err) {
    throw new HttpError(409, err.message);
  }
}

async function handlePhaseAttack(req, res) {
  methodGuard(req, ['POST']);
  const redis = getRedis();

  const game = await getGame(redis);
  if (game.state !== 'draft') {
    throw new HttpError(409, `Cannot start attack phase from state "${game.state}"`);
  }

  const ok = await runDraftToAttack(redis);
  if (!ok) throw new HttpError(409, 'Transition already in progress or state changed, try again');

  sendJson(res, 200, { ok: true, game: await getGame(redis) });
}

async function handlePhaseEnd(req, res) {
  methodGuard(req, ['POST']);
  const redis = getRedis();

  const game = await getGame(redis);
  if (game.state !== 'attack') {
    throw new HttpError(409, `Cannot end attack phase from state "${game.state}"`);
  }

  const ok = await runEvaluateRound(redis);
  if (!ok) throw new HttpError(409, 'Transition already in progress or state changed, try again');

  sendJson(res, 200, { ok: true, game: await getGame(redis) });
}

async function handleTimer(req, res) {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  const redis = getRedis();

  const fields = {};
  if (body.draftDurationSec) fields.draftDurationSec = String(body.draftDurationSec);
  if (body.attackDurationSec) fields.attackDurationSec = String(body.attackDurationSec);
  if (Object.keys(fields).length === 0) throw new HttpError(400, 'Provide draftDurationSec and/or attackDurationSec');

  await redis.hset(gameKey(), fields);

  const game = await getGame(redis);
  if (body.extendCurrentPhase) {
    if (game.state === 'draft' && body.draftDurationSec) {
      const newEnd = Date.now() + Number(body.draftDurationSec) * 1000;
      await redis.hset(gameKey(), { draftEndsAt: String(newEnd) });
    }
    if (game.state === 'attack' && body.attackDurationSec) {
      const newEnd = Date.now() + Number(body.attackDurationSec) * 1000;
      await redis.hset(gameKey(), { attackEndsAt: String(newEnd) });
    }
  }

  sendJson(res, 200, { ok: true, game: await getGame(redis) });
}

async function handleEndGame(req, res) {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  const redis = getRedis();

  const game = await getGame(redis);
  if (game.state === 'game_ended') {
    return sendJson(res, 200, { ok: true, game });
  }

  const fields = { state: 'game_ended' };
  if (body.result === 'draw') {
    fields.finalResult = 'draw';
    fields.winnerTeamId = '';
  } else if (body.result) {
    const teamIds = await getTeamIds(redis);
    if (!teamIds.includes(body.result)) throw new HttpError(400, 'result must be a known teamId or "draw"');
    fields.finalResult = 'decisive';
    fields.winnerTeamId = body.result;
  } else {
    fields.finalResult = game.finalResult || 'draw';
    fields.winnerTeamId = game.winnerTeamId || '';
  }

  await redis.hset(gameKey(), fields);
  sendJson(res, 200, { ok: true, game: await getGame(redis) });
}

async function handleReset(req, res) {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  if (body.confirm !== true) {
    throw new HttpError(400, 'Pass { confirm: true } to reset - this wipes all round data');
  }

  const redis = getRedis();
  const roundKeys = await redis.keys('ctf:round:*');
  const sessionKeys = await redis.keys('ctf:activesession:*');
  const keysToDelete = [...roundKeys, ...sessionKeys];
  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete);
  }

  await redis.del(gameKey());
  await redis.hset(gameKey(), { state: 'lobby', roundNumber: '0' });

  sendJson(res, 200, { ok: true });
}

async function handleLog(req, res) {
  methodGuard(req, ['GET']);
  const redis = getRedis();

  const game = await getGame(redis);
  const teamIds = await getTeamIds(redis);
  const rounds = [];

  for (let n = 1; n <= game.roundNumber; n++) {
    const meta = await redis.hgetall(roundKey(n));
    const teams = {};
    for (const teamId of teamIds) {
      const vault = await getVault(redis, n, teamId);
      const messages = (await redis.lrange(roundMessagesKey(n, teamId), 0, -1)) || [];
      const guesses = (await redis.lrange(roundGuessesKey(n, teamId), 0, -1)) || [];
      teams[teamId] = { vault, messages, guesses };
    }
    rounds.push({ roundNumber: n, state: meta?.state, outcome: meta?.outcome, winnerTeamId: meta?.winnerTeamId, teams });
  }

  sendJson(res, 200, { game, rounds });
}

const handlers = {
  teams: handleTeams,
  'round-start': handleRoundStart,
  'phase-attack': handlePhaseAttack,
  'phase-end': handlePhaseEnd,
  timer: handleTimer,
  'end-game': handleEndGame,
  reset: handleReset,
  log: handleLog,
};

export default withErrorHandling(async (req, res) => {
  requireAdmin(req);
  const action = req.query.action;
  const handler = handlers[action];
  if (!handler) throw new HttpError(404, `Unknown admin action: ${action}`);
  await handler(req, res);
});
