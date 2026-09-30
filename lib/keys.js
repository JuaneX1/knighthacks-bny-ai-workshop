export const gameKey = () => 'ctf:game';
export const teamsKey = () => 'ctf:teams';
export const joinCodeKey = (code) => `ctf:joincode:${code.toLowerCase()}`;
export const joinCodePattern = () => 'ctf:joincode:*';
export const activeSessionKey = (teamId) => `ctf:activesession:${teamId}`;

// The game is always exactly two teams with these fixed ids. Admins can rename them and change
// join codes, but the ids never change, so per-round data stays keyed consistently.
export const TEAM_IDS = ['team-alpha', 'team-bravo'];

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

export const rateLimitKey = (teamId) => `ctf:ratelimit:${teamId}:msg`;
export const llmCallsKey = () => 'ctf:llm:calls';
export const llmTeamCallsKey = (teamId) => `ctf:llm:calls:${teamId}`;
export const checkCooldownKey = (teamId) => `ctf:ratelimit:${teamId}:check`;
export const utilityCacheKey = (hash) => `ctf:utility:${hash}`;
export const practiceVaultKey = () => 'ctf:vault:practice';
