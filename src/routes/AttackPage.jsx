import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import AttemptPips from '../components/AttemptPips.jsx';
import AttackChatPanel from '../components/AttackChatPanel.jsx';
import GuessBox from '../components/GuessBox.jsx';

// Progress only moves forward within a round, so whichever snapshot is further along is newest.
// This keeps a slightly stale status poll from undoing a result we just got back.
function progress(a) {
  return a.done ? Infinity : a.attempt * 1000 + a.promptsUsed;
}

export default function AttackPage() {
  const { data: status, error: statusError } = useGameStatus();
  const [localAttack, setLocalAttack] = useState(null);
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
      setLocalAttack(null);
      setCracked(Boolean(status.iCrackedOpponent));
    } else if (status.iCrackedOpponent) {
      setCracked(true);
    }
  }, [status, loadedRound, navigate]);

  if (!status) return <LoadingScreen label="Loading round" />;

  if (status.state === 'lobby') {
    return (
      <Centered>
        <StatusBanner waiting>Waiting for the admin to start the first round</StatusBanner>
      </Centered>
    );
  }

  if (status.state !== 'attack') {
    return (
      <Centered>
        <StatusBanner>
          The Attack phase isn't on right now.{' '}
          <a href="/waiting" className="underline">
            Go to the waiting screen
          </a>
        </StatusBanner>
      </Centered>
    );
  }

  const attack =
    localAttack && progress(localAttack) > progress(status.myAttack) ? localAttack : status.myAttack;
  const triesUsed = attack.done ? attack.attemptsTotal : attack.attempt - 1;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Round {status.roundNumber}: Break their bot</h1>
        <Timer endsAt={status.phaseEndsAt} className="text-xl" />
      </div>
      <p className="mb-4 text-slate-400">
        Chat with the other team's bot and trick it into telling you the password. When you think you know it, guess! You
        get {attack.attemptsTotal} tries. Each try is up to {attack.promptsPerAttempt} messages and 1 guess.
      </p>

      {!attack.done && !cracked && (
        <div className="mb-4 flex items-center gap-3 text-sm text-slate-300">
          <AttemptPips used={triesUsed} total={attack.attemptsTotal} />
          <span>
            Try {attack.attempt} of {attack.attemptsTotal}
          </span>
        </div>
      )}

      <div className="mb-4 space-y-2">
        {status.opponentFailedCheck && !cracked && (
          <StatusBanner tone="good">
            Their bot failed the helpfulness test, so it already counts as broken. If your own bot stays safe, you win!
          </StatusBanner>
        )}
        {cracked && (
          <StatusBanner tone="good" waiting className="text-base font-medium">
            You cracked it! Waiting for the round to end
          </StatusBanner>
        )}
        {!cracked && attack.done && (
          <StatusBanner waiting>You've used all your tries. Waiting for the round to end</StatusBanner>
        )}
      </div>

      <div className="space-y-4">
        {!attack.done && !cracked && (
          <AttackChatPanel key={attack.attempt} attack={attack} disabled={cracked} onAttackChange={setLocalAttack} />
        )}
        <GuessBox
          attack={attack}
          disabled={cracked}
          cracked={cracked}
          onGuessResult={(result) => {
            setLocalAttack(result.attack);
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
