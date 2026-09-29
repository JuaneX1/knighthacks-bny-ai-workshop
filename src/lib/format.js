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
