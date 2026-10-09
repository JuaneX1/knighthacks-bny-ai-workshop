import { getRedis } from '../../lib/redis.js';
import {
  gameKey,
  teamsKey,
  joinCodeKey,
  joinCodePattern,
  TEAM_IDS,
  teamCountFor,
  roundKey,
  roundMessagesKey,
  roundGuessesKey,
  roundFinishedKey,
  activeSessionKey,
} from '../../lib/keys.js';
import { withErrorHandling, methodGuard, readJsonBody, sendJson, requireAdmin, HttpError } from '../../lib/http.js';
import {
  getGame,
  getTeamIds,
  getVault,
  startRound,
  runDraftToAttack,
  runEvaluateRound,
  getIterations,
  describeIterations,
  getOpponentTeamId,
  configuredTeamIds,
  MAX_PROMPTS_PER_ATTEMPT,
} from '../../lib/stateMachine.js';
import { getCachedUtility } from '../../lib/utilityCheck.js';

// Every admin action used to be its own file under /api/admin. Consolidated into one
// dynamic route (Vercel's [action].js path-segment convention) so it counts as a single
// serverless function instead of ten - the Hobby plan caps a deployment at 12 total.
// URLs are unchanged: /api/admin/teams, /api/admin/round-start, etc. all still work,
// Vercel just routes them all here with req.query.action set to the matched segment.

async function handleTeams(req, res) {
  methodGuard(req, ['POST', 'GET']);
  const redis = getRedis();

  if (req.method === 'GET') {
    const raw = (await redis.hgetall(teamsKey())) || {};
    const teams = TEAM_IDS.filter((teamId) => raw[teamId]).map((teamId) => ({ teamId, ...raw[teamId] }));
    return sendJson(res, 200, { teams });
  }

  const body = await readJsonBody(req);
  const teams = Array.isArray(body.teams) ? body.teams : [];
  const { mode } = await getGame(redis);
  const teamCount = teamCountFor(mode);
  if (teams.length !== teamCount) {
    throw new HttpError(400, `Exactly ${teamCount} teams are required in ${mode} mode`);
  }

  // Team ids are fixed by position - only names and join codes are editable. Saving replaces
  // the whole team list instead of adding to it, so edits can never create an extra team.
  const cleaned = teams.map((t, i) => ({
    teamId: TEAM_IDS[i],
    name: String(t.name || '').trim(),
    joinCode: String(t.joinCode || '').trim(),
  }));
  if (cleaned.some((t) => !t.name || !t.joinCode)) {
    throw new HttpError(400, 'Each team needs a name and a join code');
  }
  if (new Set(cleaned.map((t) => t.joinCode.toLowerCase())).size !== cleaned.length) {
    throw new HttpError(400, 'Every team needs a different join code');
  }

  // Also drops any stale join codes (including ones left by older duplicate saves).
  const staleCodeKeys = await redis.keys(joinCodePattern());
  await redis.del(teamsKey(), ...staleCodeKeys);
  await redis.hset(
    teamsKey(),
    Object.fromEntries(cleaned.map((t) => [t.teamId, JSON.stringify({ name: t.name, joinCode: t.joinCode })])),
  );
  for (const t of cleaned) {
    await redis.set(joinCodeKey(t.joinCode), t.teamId);
  }

  sendJson(res, 200, { ok: true, teams: cleaned });
}

// Switches between a 2-team duel and a 4-team knockout tournament. Only allowed before the first round.
async function handleMode(req, res) {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  if (!['duel', 'tournament'].includes(body.mode)) {
    throw new HttpError(400, 'mode must be "duel" or "tournament"');
  }

  const redis = getRedis();
  const game = await getGame(redis);
  if (game.state !== 'lobby') {
    throw new HttpError(409, 'Reset the game before switching modes');
  }

  await redis.hset(gameKey(), { mode: body.mode });
  sendJson(res, 200, { ok: true, game: await getGame(redis) });
}

// Picks who goes through from a drawn semifinal, so the final can start.
async function handleAdvance(req, res) {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  const redis = getRedis();

  const game = await getGame(redis);
  if (game.stage !== 'semis' || game.state !== 'round_ended') {
    throw new HttpError(409, 'You can only pick who advances once the semifinals have ended');
  }
  const matchIndex = Number(body.matchIndex);
  const match = game.matches[matchIndex];
  if (!match || !match.includes(body.teamId)) {
    throw new HttpError(400, 'teamId must be one of the teams in that semifinal');
  }
  if (game.finalists[matchIndex]) {
    throw new HttpError(409, 'That semifinal already has a winner');
  }

  const finalists = game.matches.map((_, i) => (i === matchIndex ? body.teamId : game.finalists[i] || null));
  await redis.hset(gameKey(), { finalists: JSON.stringify(finalists) });
  sendJson(res, 200, { ok: true, game: await getGame(redis) });
}

async function handleRoundStart(req, res) {
  methodGuard(req, ['POST']);
  const body = await readJsonBody(req);
  const redis = getRedis();

  try {
    const game = await startRound(redis, {
      draftDurationSec: body.draftDurationSec,
      attackDurationSec: body.attackDurationSec,
      promptsPerAttempt: body.promptsPerAttempt,
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

  // Adds time to the running phase's timer, counting from now if it has already run out.
  if (body.addSec) {
    const game = await getGame(redis);
    const field = game.state === 'draft' ? 'draftEndsAt' : game.state === 'attack' ? 'attackEndsAt' : null;
    if (!field) throw new HttpError(409, 'There is no phase timer running');
    const addMs = Math.min(3600, Math.max(1, Number(body.addSec) || 0)) * 1000;
    const newEnd = Math.max(Date.now(), game[field] || 0) + addMs;
    await redis.hset(gameKey(), { [field]: String(newEnd) });
    await redis.hset(roundKey(game.roundNumber), { [field]: String(newEnd) });
    return sendJson(res, 200, { ok: true, game: await getGame(redis) });
  }

  const fields = {};
  if (body.draftDurationSec) fields.draftDurationSec = String(body.draftDurationSec);
  if (body.attackDurationSec) fields.attackDurationSec = String(body.attackDurationSec);
  if (body.promptsPerAttempt) {
    const prompts = Math.round(Number(body.promptsPerAttempt) || 0);
    fields.promptsPerAttempt = String(Math.min(MAX_PROMPTS_PER_ATTEMPT, Math.max(1, prompts)));
  }
  if (Object.keys(fields).length === 0) {
    throw new HttpError(400, 'Provide draftDurationSec, attackDurationSec and/or promptsPerAttempt');
  }

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
    const teamIds = await getTeamIds(redis, game.mode);
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
  const { mode } = await getGame(redis);
  const roundKeys = await redis.keys('ctf:round:*');
  const sessionKeys = await redis.keys('ctf:activesession:*');
  const keysToDelete = [...roundKeys, ...sessionKeys];
  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete);
  }

  await redis.del(gameKey());
  await redis.hset(gameKey(), { state: 'lobby', roundNumber: '0', mode });

  sendJson(res, 200, { ok: true });
}

async function handleLog(req, res) {
  methodGuard(req, ['GET']);
  const redis = getRedis();

  const game = await getGame(redis);
  const rounds = [];

  for (let n = 1; n <= game.roundNumber; n++) {
    const meta = await redis.hgetall(roundKey(n));
    const teams = {};
    for (const teamId of (meta?.matches || []).flat()) {
      const vault = await getVault(redis, n, teamId);
      const messages = (await redis.lrange(roundMessagesKey(n, teamId), 0, -1)) || [];
      const guesses = (await redis.lrange(roundGuessesKey(n, teamId), 0, -1)) || [];
      teams[teamId] = { vault, messages, guesses };
    }
    rounds.push({ roundNumber: n, state: meta?.state, stage: meta?.stage || '', results: meta?.results || [], teams });
  }

  sendJson(res, 200, { game, rounds });
}

// Where a team's bot stands: no text yet, saved but not tested, or the helpfulness test result.
async function vaultStatus(redis, game, vault) {
  if (!vault || (!vault.systemPrompt && !vault.jobDescription)) return 'empty';
  if (game.state !== 'draft') {
    if (vault.utilityPassed === null) return 'untested';
    return vault.utilityPassed ? 'passed' : 'failed';
  }
  const check = await getCachedUtility(redis, vault);
  if (!check) return 'untested';
  return check.passed ? 'passed' : 'failed';
}

// Live view for the admin dashboard: who has joined, and how each team is doing this round.
async function handleOverview(req, res) {
  methodGuard(req, ['GET']);
  const redis = getRedis();
  const game = await getGame(redis);
  const teams = (await redis.hgetall(teamsKey())) || {};
  const inRound = ['draft', 'attack'].includes(game.state) && game.roundNumber > 0;
  const finished = inRound ? (await redis.smembers(roundFinishedKey(game.roundNumber))) || [] : [];

  const out = [];
  for (const teamId of configuredTeamIds(teams, game.mode)) {
    const joined = (await redis.exists(activeSessionKey(teamId))) === 1;
    const opponentTeamId = getOpponentTeamId(game, teamId);
    let round = null;
    if (inRound && opponentTeamId) {
      const vault = await getVault(redis, game.roundNumber, teamId);
      const opponentVault = await getVault(redis, game.roundNumber, opponentTeamId);
      const its = await getIterations(redis, game.roundNumber, teamId);
      round = {
        opponentTeamId,
        vault: await vaultStatus(redis, game, vault),
        vaultCracked: Boolean(vault?.crackedByOpponent),
        crackedOpponent: Boolean(opponentVault?.crackedByOpponent),
        attack: describeIterations(its, game.promptsPerAttempt),
        finished: finished.includes(teamId),
      };
    }
    out.push({ teamId, name: teams[teamId].name, joinCode: teams[teamId].joinCode, joined, playing: Boolean(opponentTeamId), round });
  }

  sendJson(res, 200, {
    teams: out,
    settings: {
      draftDurationSec: game.draftDurationSec,
      attackDurationSec: game.attackDurationSec,
      promptsPerAttempt: game.promptsPerAttempt,
    },
  });
}

const handlers = {
  overview: handleOverview,
  teams: handleTeams,
  mode: handleMode,
  advance: handleAdvance,
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
