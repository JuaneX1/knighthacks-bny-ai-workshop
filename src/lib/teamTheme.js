// The player's team colors the whole UI on the player screens; everything else stays neutral.
// The team is remembered so a refresh (and the inline script in index.html) can apply it before
// the first status poll comes back. Keep PLAYER_ROUTES in sync with that script.
const STORAGE_KEY = 'ctf_team';
export const PLAYER_ROUTES = ['/defend', '/attack', '/waiting'];

export function rememberedTeam() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberTeam(teamId) {
  try {
    if (teamId) localStorage.setItem(STORAGE_KEY, teamId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable; the theme still applies for this page view
  }
}

export function applyTeamTheme(teamId) {
  if (teamId) document.documentElement.setAttribute('data-team', teamId);
  else document.documentElement.removeAttribute('data-team');
}
