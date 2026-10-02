import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import { useScoreboard } from '../hooks/useScoreboard.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import RoundHistoryList from '../components/RoundHistoryList.jsx';
import RoundHistorySkeleton from '../components/RoundHistorySkeleton.jsx';
import Spinner from '../components/Spinner.jsx';
import { PHASE_LABELS } from '../lib/format.js';

export default function WaitingPage() {
  const { data: status, error: statusError } = useGameStatus();
  const { data: board } = useScoreboard();
  const navigate = useNavigate();

  useEffect(() => {
    if (statusError?.status === 401) navigate('/');
  }, [statusError, navigate]);

  useEffect(() => {
    if (!status) return;
    if (status.state === 'draft') navigate('/defend');
  }, [status, navigate]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="heading-glow mb-2 flex items-center gap-3 text-3xl font-bold">
        {status ? (
          <span key={status.state} className="motion-safe:animate-fade-in-up">
            {PHASE_LABELS[status.state]}
          </span>
        ) : (
          <>
            <Spinner className="h-7 w-7 text-brand-blue" />
            <span className="text-brand-blue/50">Loading</span>
          </>
        )}
      </h1>
      {status?.phaseEndsAt && (
        <p className="mb-6 text-xl">
          Time remaining: <Timer endsAt={status.phaseEndsAt} />
        </p>
      )}

      {(status?.state === 'lobby' || status?.state === 'round_ended') && (
        <div className="mb-6">
          <StatusBanner waiting>
            {status.state === 'lobby'
              ? 'Waiting for the admin to start the first round'
              : 'Waiting for the admin to start the next round'}
          </StatusBanner>
        </div>
      )}

      {status?.state === 'game_ended' && (
        <div className="mb-6">
          <StatusBanner tone={status.amIWinner ? 'good' : 'info'}>
            {status.finalResult === 'draw'
              ? 'Game ended in a draw.'
              : status.amIWinner
              ? 'Your team won the game!'
              : 'Game over - the other team won this time.'}
          </StatusBanner>
        </div>
      )}

      <h2 className="mb-3 text-xl font-semibold text-ink">Round history</h2>
      {board ? <RoundHistoryList rounds={board.rounds} teams={board.teams} /> : <RoundHistorySkeleton />}
    </div>
  );
}
