import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import AttackChatPanel from '../components/AttackChatPanel.jsx';
import GuessBox from '../components/GuessBox.jsx';

export default function AttackPage() {
  const { data: status, error: statusError } = useGameStatus();
  const [iterations, setIterations] = useState(null);
  const [cracked, setCracked] = useState(false);
  const [loadedRound, setLoadedRound] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (statusError?.status === 401) navigate('/');
  }, [statusError, navigate]);

  useEffect(() => {
    if (!status) return;
    if (status.state === 'draft') navigate('/defend');
    if (status.roundNumber && status.roundNumber !== loadedRound) {
      setLoadedRound(status.roundNumber);
      setIterations(status.myIterations);
      setCracked(Boolean(status.iCrackedOpponent));
    } else if (status.iCrackedOpponent) {
      setCracked(true);
    }
  }, [status, loadedRound, navigate]);

  if (!status) return <div className="p-8 text-slate-400">Loading...</div>;

  if (status.state === 'lobby') {
    return (
      <Centered>
        <StatusBanner>Waiting for the admin to start the first round.</StatusBanner>
      </Centered>
    );
  }

  if (status.state !== 'attack') {
    return (
      <Centered>
        <StatusBanner>
          Attack phase isn't active right now (currently: {status.state}).{' '}
          <a href="/waiting" className="underline">Go to waiting screen</a>
        </StatusBanner>
      </Centered>
    );
  }

  const its = iterations || status.myIterations;
  const exhausted = its.chatUsed >= 3;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attack the opponent's vault - Round {status.roundNumber}</h1>
        <Timer endsAt={status.phaseEndsAt} className="text-xl" />
      </div>

      {cracked && (
        <div className="mb-4">
          <StatusBanner tone="good">You cracked it! Waiting for the round to resolve.</StatusBanner>
        </div>
      )}

      {!cracked && exhausted && (
        <div className="mb-4">
          <StatusBanner>You've used all 3 attempts. Waiting for the round to resolve.</StatusBanner>
        </div>
      )}

      <div className="space-y-4">
        <AttackChatPanel
          chatUsed={its.chatUsed}
          chatRemaining={its.chatRemaining}
          disabled={cracked}
          onChatUsedChange={(chatUsed, chatRemaining) =>
            setIterations((prev) => ({ ...prev, chatUsed, chatRemaining }))
          }
        />
        <GuessBox
          chatUsed={its.chatUsed}
          guessUsed={its.guessUsed}
          guessRemaining={its.guessRemaining}
          disabled={cracked}
          onGuessResult={(result) => {
            setIterations((prev) => ({ ...prev, guessUsed: result.guessUsed, guessRemaining: result.guessRemaining }));
            if (result.correct) setCracked(true);
          }}
        />
      </div>
    </div>
  );
}

function Centered({ children }) {
  return <div className="mx-auto max-w-lg px-6 py-16">{children}</div>;
}
