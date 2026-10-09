async function request(path, { method = 'GET', body, adminToken } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  join: (joinCode) => request('/join', { method: 'POST', body: { joinCode } }),
  status: () => request('/status'),
  saveAndTestVault: (vault) => request('/vault', { method: 'POST', body: vault }),
  testChat: (payload) => request('/vault-test-chat', { method: 'POST', body: payload }),
  attackConversation: () => request('/attack-chat'),
  attackChat: (message) => request('/attack-chat', { method: 'POST', body: { message } }),
  attackGuess: (guess) => request('/attack-guess', { method: 'POST', body: { guess } }),
  attackGiveUp: () => request('/attack-guess', { method: 'POST', body: { giveUp: true } }),
  scoreboard: () => request('/scoreboard'),

  admin: {
    overview: (adminToken) => request('/admin/overview', { adminToken }),
    listTeams: (adminToken) => request('/admin/teams', { adminToken }),
    setTeams: (teams, adminToken) => request('/admin/teams', { method: 'POST', body: { teams }, adminToken }),
    setMode: (mode, adminToken) => request('/admin/mode', { method: 'POST', body: { mode }, adminToken }),
    advance: (matchIndex, teamId, adminToken) =>
      request('/admin/advance', { method: 'POST', body: { matchIndex, teamId }, adminToken }),
    roundStart: (payload, adminToken) => request('/admin/round-start', { method: 'POST', body: payload, adminToken }),
    phaseAttack: (adminToken) => request('/admin/phase-attack', { method: 'POST', adminToken }),
    phaseEnd: (adminToken) => request('/admin/phase-end', { method: 'POST', adminToken }),
    timer: (payload, adminToken) => request('/admin/timer', { method: 'POST', body: payload, adminToken }),
    endGame: (payload, adminToken) => request('/admin/end-game', { method: 'POST', body: payload, adminToken }),
    reset: (adminToken) => request('/admin/reset', { method: 'POST', body: { confirm: true }, adminToken }),
    log: (adminToken) => request('/admin/log', { adminToken }),
  },
};
