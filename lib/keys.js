export const gameKey = () => 'ctf:game';
export const teamsKey = () => 'ctf:teams';
export const joinCodeKey = (code) => `ctf:joincode:${code.toLowerCase()}`;
export const joinCodePattern = () => 'ctf:joincode:*';
export const activeSessionKey = (teamId) => `ctf:activesession:${teamId}`;

// Fixed team slots. A duel uses the first two; a tournament uses all four, with semifinals
// 1 vs 2 and 3 vs 4. Admins can rename teams and change join codes, but the ids never change,
// so per-round data stays keyed consistently.
export const TEAM_IDS = ['team-spark', 'team-thrive', 'team-own-it', 'team-curious'];

// How many team slots a game mode plays with.
export const teamCountFor = (mode) => (mode === 'tournament' ? 4 : 2);

// A team's latest saved defense, kept outside round data so it carries into the next round
// (and survives an admin reset).
export const teamDefenseKey = (teamId) => `ctf:defense:${teamId}`;

export const roundKey = (n) => `ctf:round:${n}`;
export const roundVaultKey = (n, teamId) => `ctf:round:${n}:vault:${teamId}`;
export const roundMessagesKey = (n, teamId) => `ctf:round:${n}:messages:${teamId}`;
export const roundIterationsKey = (n, teamId) => `ctf:round:${n}:iterations:${teamId}`;
export const roundGuessesKey = (n, teamId) => `ctf:round:${n}:guesses:${teamId}`;
export const roundLockKey = (n, teamId) => `ctf:round:${n}:lock:msg:${teamId}`;
// Chat history for one attacking team's current try (attempt) against the opponent's vault.
export const roundConvoKey = (n, teamId, attempt) => `ctf:round:${n}:convo:${teamId}:${attempt}`;
// Teams that are done attacking this round (cracked their opponent).
export const roundFinishedKey = (n) => `ctf:round:${n}:finished`;
// Public snapshot of a sealed round, written once when it ends so the scoreboard reads one key per round.
export const roundSummaryKey = (n) => `ctf:round:${n}:summary`;

export const rateLimitKey = (teamId) => `ctf:ratelimit:${teamId}:msg`;
export const llmCallsKey = () => 'ctf:llm:calls';
export const llmTeamCallsKey = (teamId) => `ctf:llm:calls:${teamId}`;
export const checkCooldownKey = (teamId) => `ctf:ratelimit:${teamId}:check`;
export const utilityCacheKey = (hash) => `ctf:utility:${hash}`;
