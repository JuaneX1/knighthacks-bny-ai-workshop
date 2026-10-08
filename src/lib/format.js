export function formatCountdown(endsAt, now = Date.now()) {
  if (!endsAt) return '--:--';
  const remainingMs = Math.max(0, endsAt - now);
  const totalSec = Math.ceil(remainingMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export const PHASE_LABELS = {
  lobby: 'Waiting to start',
  draft: 'Draft phase',
  attack: 'Attack phase',
  round_ended: 'Round ended',
  game_ended: 'Game over',
};

export const STAGE_LABELS = {
  semis: 'Semifinals',
  final: 'Final',
};

// Heading for the current round: the tournament stage, or "Round N" in a duel.
export function roundTitle({ stage, roundNumber }) {
  return STAGE_LABELS[stage] || `Round ${roundNumber}`;
}

// "SPARK vs THRIVE" style label for a pair of team ids.
export function matchLabel(teamIds, teams) {
  return teamIds.map((id) => teams?.[id]?.name || id).join(' vs ');
}

// Outcome of one finished match: who won, or a draw.
export function matchResultLabel(result, teams) {
  if (!result.winnerTeamId) return 'Draw';
  return `${teams?.[result.winnerTeamId]?.name || result.winnerTeamId} won`;
}
