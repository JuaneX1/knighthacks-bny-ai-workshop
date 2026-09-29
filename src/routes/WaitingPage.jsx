import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import { useScoreboard } from '../hooks/useScoreboard.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import RoundHistoryList from '../components/RoundHistoryList.jsx';
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
      <h1 className="mb-2 text-3xl font-bold">
        {status ? PHASE_LABELS[status.state] : 'Loading...'}
      </h1>
      {status?.phaseEndsAt && (
        <p className="mb-6 text-xl">
          Time remaining: <Timer endsAt={status.phaseEndsAt} />
        </p>
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

      <h2 className="mb-3 text-xl font-semibold">Round history</h2>
      {board ? <RoundHistoryList rounds={board.rounds} teams={board.teams} /> : <p>Loading scoreboard...</p>}
    </div>
  );
}
