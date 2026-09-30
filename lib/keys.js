export const gameKey = () => 'ctf:game';
export const teamsKey = () => 'ctf:teams';
export const joinCodeKey = (code) => `ctf:joincode:${code.toLowerCase()}`;
export const activeSessionKey = (teamId) => `ctf:activesession:${teamId}`;

export const roundKey = (n) => `ctf:round:${n}`;
export const roundVaultKey = (n, teamId) => `ctf:round:${n}:vault:${teamId}`;
export const roundMessagesKey = (n, teamId) => `ctf:round:${n}:messages:${teamId}`;
export const roundIterationsKey = (n, teamId) => `ctf:round:${n}:iterations:${teamId}`;
export const roundGuessesKey = (n, teamId) => `ctf:round:${n}:guesses:${teamId}`;
export const roundLockKey = (n, teamId) => `ctf:round:${n}:lock:msg:${teamId}`;

export const rateLimitKey = (teamId) => `ctf:ratelimit:${teamId}:msg`;
export const practiceVaultKey = () => 'ctf:vault:practice';
