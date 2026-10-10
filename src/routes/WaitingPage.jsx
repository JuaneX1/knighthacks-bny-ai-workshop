import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import { useScoreboard } from '../hooks/useScoreboard.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import RoundHistoryList from '../components/RoundHistoryList.jsx';
import RoundHistorySkeleton from '../components/RoundHistorySkeleton.jsx';
import Bracket from '../components/Bracket.jsx';
import Spinner from '../components/Spinner.jsx';
import TeamBadge from '../components/TeamBadge.jsx';
import TeamName from '../components/TeamName.jsx';
import { useTeamTheme } from '../hooks/useTeamTheme.js';
import { useAnnouncePhase } from '../lib/phaseAnnouncer.js';
import { PHASE_LABELS } from '../lib/format.js';

// History only changes when a round ends, so this page checks the scoreboard slowly.
const BOARD_INTERVAL_MS = 15000;

const ADVANCEMENT_MESSAGES = {
  advanced: "You're in the final! Stretch your fingers, it starts soon",
  eliminated: "You're out, but the final still needs an audience",
  pending: 'Your semifinal ended dead even. The host is picking who moves on',
};

export default function WaitingPage() {
  const { data: status, error: statusError } = useGameStatus();
  const { data: board, refresh: refreshBoard } = useScoreboard({ intervalMs: BOARD_INTERVAL_MS });
  const navigate = useNavigate();
  useTeamTheme(status, statusError);
  useAnnouncePhase(status);

  useEffect(() => {
    if (statusError?.status === 401) navigate('/');
  }, [statusError, navigate]);

  // The bracket and history change when the phase does, so don't wait out the slow interval.
  useEffect(() => {
    if (status?.state) refreshBoard();
  }, [status?.state, status?.roundNumber, refreshBoard]);

  useEffect(() => {
    if (status?.role !== 'player') return;
    if (status.state === 'draft') navigate('/defend');
    if (status.state === 'attack') navigate('/attack');
  }, [status, navigate]);

  const watching = status?.role === 'spectator' && ['draft', 'attack'].includes(status.state);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <TeamBadge status={status} />
      <h1 className="heading-glow mb-2 flex items-center gap-3 text-3xl font-bold">
        {status ? (
          <span key={status.state} className="motion-safe:animate-fade-in-up">
            {PHASE_LABELS[status.state]}
          </span>
        ) : (
          <>
            <Spinner className="h-7 w-7 text-brand-blue" />
            <span className="text-brand-blue/50">Connecting</span>
          </>
        )}
      </h1>
      {status?.phaseEndsAt && (
        <p className="mb-6 text-xl">
          <span className="text-brand-blue/50">Phase timer:</span> <Timer endsAt={status.phaseEndsAt} />
        </p>
      )}

      {watching && (
        <div className="mb-6">
          <StatusBanner>Your team's out. Grab a seat and watch the final!</StatusBanner>
        </div>
      )}

      {(status?.state === 'lobby' || status?.state === 'round_ended') && (
        <div className="mb-6">
          <StatusBanner waiting>{waitingMessage(status)}</StatusBanner>
        </div>
      )}

      {status?.state === 'game_ended' && (
        <div className="mb-6">
          <StatusBanner tone={status.amIWinner ? 'good' : 'info'}>
            {status.finalResult === 'draw'
              ? 'Dead even. The game ends in a draw.'
              : status.amIWinner
              ? 'Your team won the game!'
              : (
                <>
                  GG. <TeamName teamId={status.winnerTeamId} teams={board?.teams} className="font-semibold" /> took it
                  this time.
                </>
              )}
          </StatusBanner>
        </div>
      )}

      {board?.mode === 'tournament' && (
        <div className="mb-8">
          <Bracket semis={board.lineup} finalists={board.finalists} winnerTeamId={board.winnerTeamId} teams={board.teams} />
        </div>
      )}

      <h2 className="mb-3 text-xl font-semibold text-ink">Round history</h2>
      {board ? <RoundHistoryList rounds={board.rounds} teams={board.teams} /> : <RoundHistorySkeleton />}
    </div>
  );
}

// What a team is waiting on between rounds.
function waitingMessage(status) {
  if (status.state === 'lobby') return 'Hold tight. The host kicks off round one soon';
  if (status.advancement) return ADVANCEMENT_MESSAGES[status.advancement];
  if (status.stage === 'final') return 'The final ended dead even. The host breaks the tie';
  return 'Catch your breath. Next round starts soon';
}
