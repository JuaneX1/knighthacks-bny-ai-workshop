import { useEffect } from 'react';
import { applyTeamTheme, rememberTeam } from '../lib/teamTheme.js';

// Keeps the player's team theme in step with their session: applied once status says which team
// they're on, dropped when the session is no longer valid.
export function useTeamTheme(status, statusError) {
  const teamId = status?.teamId;

  useEffect(() => {
    if (!teamId) return;
    rememberTeam(teamId);
    applyTeamTheme(teamId);
  }, [teamId]);

  useEffect(() => {
    if (statusError?.status !== 401) return;
    rememberTeam(null);
    applyTeamTheme(null);
  }, [statusError]);
}
