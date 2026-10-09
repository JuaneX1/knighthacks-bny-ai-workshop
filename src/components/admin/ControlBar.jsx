import Timer from '../Timer.jsx';
import Spinner from '../Spinner.jsx';
import { api } from '../../lib/api.js';
import { STAGE_LABELS } from '../../lib/format.js';
import { teamCountFor } from '../../../lib/keys.js';

const STEPS = [
  { state: 'lobby', label: 'Lobby' },
  { state: 'draft', label: 'Defend' },
  { state: 'attack', label: 'Attack' },
  { state: 'round_ended', label: 'Results' },
  { state: 'game_ended', label: 'Game over' },
];

// Sticky bar at the top of the admin screen: where the game is, the phase timer, and the one
// button that moves it on. Running the event is mostly pressing that button.
export default function ControlBar({ board, overview, settings, run, busy, now, onReset }) {
  const action = nextAction({ board, overview, settings, run, onReset });
  const timed = board.state === 'draft' || board.state === 'attack';
  const timeUp = timed && board.phaseEndsAt && now >= board.phaseEndsAt;

  return (
    <div className="sticky top-0 z-20 mb-6 border-b border-brand-blue/20 bg-void/90 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-6 pr-20 xl:pr-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-brand-blue/50">
            {board.mode === 'tournament' ? 'Tournament' : 'Duel'}
            {board.roundNumber > 0 && board.state !== 'lobby' && ` · Round ${board.roundNumber}`}
            {STAGE_LABELS[board.stage] && ` · ${STAGE_LABELS[board.stage]}`}
          </p>
          <StepTracker state={board.state} />
        </div>

        {timed && (
          <div className="flex items-center gap-3">
            <Timer endsAt={board.phaseEndsAt} className="text-3xl font-bold" />
            <button
              type="button"
              onClick={() => run((token) => api.admin.timer({ addSec: 60 }, token), 'Added 1 minute', '+1 min')}
              disabled={Boolean(busy)}
              className="btn-neutral px-2 py-1 text-xs"
              title="Add a minute to the phase timer"
            >
              +1 min
            </button>
          </div>
        )}

        {action && (
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <button
              type="button"
              onClick={action.onClick}
              disabled={Boolean(action.blocked) || Boolean(busy)}
              className={`${action.danger ? 'btn-danger' : 'btn-primary'} min-w-[14rem] py-2.5 ${
                timeUp && !busy ? 'motion-safe:animate-glow-pulse-blue' : ''
              }`}
            >
              {busy === action.label && <Spinner />}
              {action.label}
            </button>
            <p
              className={`max-w-xs text-xs sm:text-right ${
                action.warning || timeUp ? 'text-brand-warn' : 'text-brand-blue/50'
              }`}
            >
              {action.blocked ||
                action.warning ||
                (timeUp ? "Time's up. Teams keep playing until you move on." : action.hint)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepTracker({ state }) {
  const current = STEPS.findIndex((s) => s.state === state);
  return (
    <ol className="mt-2 flex flex-wrap items-center gap-1 text-sm">
      {STEPS.map((step, i) => (
        <li key={step.state} className="flex items-center gap-1">
          {i > 0 && <span className={`h-px w-4 ${i <= current ? 'bg-brand-blue/60' : 'bg-brand-blue/20'}`} />}
          <span
            className={`rounded-full px-2.5 py-0.5 transition-colors ${
              i === current
                ? 'bg-brand-blue font-semibold text-btn-ink'
                : i < current
                ? 'text-brand-blue/80'
                : 'text-brand-blue/30'
            }`}
            aria-current={i === current ? 'step' : undefined}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

// The single next step for the current game state, with why it's blocked when it is.
function nextAction({ board, overview, settings, run, onReset }) {
  const tournament = board.mode === 'tournament';
  const startRound = (label, done) => ({
    label,
    onClick: () => run((token) => api.admin.roundStart(settings, token), done, label),
  });

  switch (board.state) {
    case 'lobby': {
      const needed = teamCountFor(board.mode);
      const configured = overview?.teams?.length ?? needed;
      const joined = overview?.teams?.filter((t) => t.joined).length ?? 0;
      return {
        ...startRound(tournament ? 'Start semifinals' : 'Start round 1', 'Round started: defend phase is on'),
        blocked: configured < needed ? `Save ${needed} teams in Setup first` : null,
        hint: `${joined} of ${needed} teams joined`,
      };
    }
    case 'draft':
      return {
        label: 'Start attack phase',
        hint: 'Locks in every bot and starts the attack timer',
        warning: untestedWarning(overview, board.teams),
        onClick: () => run((token) => api.admin.phaseAttack(token), 'Attack phase started', 'Start attack phase'),
      };
    case 'attack':
      return {
        label: 'End attack phase',
        hint: 'Scores the round and reveals every bot',
        onClick: () => run((token) => api.admin.phaseEnd(token), 'Round ended and scored', 'End attack phase'),
      };
    case 'round_ended': {
      if (tournament && board.stage === 'semis') {
        const undecided = board.finalists.length < 2 || board.finalists.some((id) => !id);
        return {
          ...startRound('Start final', 'Final started: defend phase is on'),
          blocked: undecided ? 'Pick who advances from the drawn semifinal first' : null,
          hint: 'Semifinal winners play for the title',
        };
      }
      if (tournament) {
        return { label: 'Pick a champion', blocked: 'The final was a draw. Pick the champion below', onClick: () => {} };
      }
      return {
        ...startRound('Start next round', 'Next round started: defend phase is on'),
        hint: 'That round was a draw, so the duel goes on',
      };
    }
    case 'game_ended':
      return { label: 'Reset for a new game', danger: true, hint: 'Players will need to rejoin', onClick: onReset };
    default:
      return null;
  }
}

// Bots that haven't passed a test when the attack phase starts count as broken, so call them out.
function untestedWarning(overview, teams) {
  const names = (overview?.teams || [])
    .filter((t) => t.round && t.round.vault !== 'passed')
    .map((t) => teams?.[t.teamId]?.name || t.name);
  if (names.length === 0) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return `${list} ${names.length === 1 ? "hasn't" : "haven't"} passed the bot test yet and will count as broken`;
}
