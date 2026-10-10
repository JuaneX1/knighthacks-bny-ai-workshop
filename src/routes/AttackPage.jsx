import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import Timer, { TimeUpNotice } from '../components/Timer.jsx';
import { useTeamTheme } from '../hooks/useTeamTheme.js';
import { useAnnouncePhase } from '../lib/phaseAnnouncer.js';
import TeamBadge from '../components/TeamBadge.jsx';
import TeamName from '../components/TeamName.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import AttackChatPanel from '../components/AttackChatPanel.jsx';
import AttackHintsPanel from '../components/AttackHintsPanel.jsx';
import GuessBox from '../components/GuessBox.jsx';
import SwordIcon from '../components/icons/SwordIcon.jsx';
import { roundTitle } from '../lib/format.js';

// Progress only moves forward within a round, so whichever snapshot is further along is newest.
// This keeps a slightly stale status poll from undoing a result we just got back.
function progress(a) {
  return a.attempt * 1000 + a.promptsUsed;
}

export default function AttackPage() {
  const { data: status, error: statusError } = useGameStatus();
  const [localAttack, setLocalAttack] = useState(null);
  const [cracked, setCracked] = useState(false);
  const [loadedRound, setLoadedRound] = useState(null);
  const navigate = useNavigate();
  useTeamTheme(status, statusError);
  useAnnouncePhase(status);

  useEffect(() => {
    if (statusError?.status === 401) navigate('/');
  }, [statusError, navigate]);

  useEffect(() => {
    if (!status) return;
    if (status.role === 'spectator' && ['draft', 'attack'].includes(status.state)) navigate('/waiting');
    if (status.state === 'draft') navigate('/defend');
    if (['round_ended', 'game_ended'].includes(status.state)) navigate('/waiting');
    if (status.roundNumber && status.roundNumber !== loadedRound) {
      setLoadedRound(status.roundNumber);
      setLocalAttack(null);
      setCracked(Boolean(status.iCrackedOpponent));
    } else if (status.iCrackedOpponent) {
      setCracked(true);
    }
  }, [status, loadedRound, navigate]);

  if (!status) return <LoadingScreen label="Connecting" />;

  if (status.state === 'lobby') {
    return (
      <Centered>
        <StatusBanner waiting>Hold tight. The host kicks off round one soon</StatusBanner>
      </Centered>
    );
  }

  if (status.state !== 'attack') {
    return (
      <Centered>
        <StatusBanner>
          The Attack phase isn't on right now.{' '}
          <a href="/waiting" className="text-brand-blue underline">
            Go to the waiting screen
          </a>
        </StatusBanner>
      </Centered>
    );
  }

  const attack =
    localAttack && progress(localAttack) > progress(status.myAttack) ? localAttack : status.myAttack;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <TeamBadge status={status} />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="heading-glow flex items-center gap-2 text-2xl font-bold">
          <SwordIcon className="h-6 w-6 text-brand-blue drop-shadow-[0_0_6px_rgb(var(--color-blue)/0.6)]" />
          {roundTitle(status)}: Crack their bot
        </h1>
        <Timer endsAt={status.phaseEndsAt} className="text-xl" />
      </div>
      <TimeUpNotice endsAt={status.phaseEndsAt}>
        Time's up! Finish this try, the round ends any second
      </TimeUpNotice>
      <p className="mb-4 text-brand-blue/50">
        Talk <TeamName teamId={status.opponentTeamId} name={status.opponentName} className="font-semibold" />
        's bot into spilling its password, then take your shot. Tries are unlimited: each one is up to{' '}
        {attack.promptsPerAttempt} messages and one guess.
      </p>

      {!cracked && (
        <div key={attack.attempt} className="mb-4 font-mono text-sm font-bold uppercase tracking-widest text-brand-blue motion-safe:animate-slam-in">
          Try #{attack.attempt}
        </div>
      )}

      <div className="mb-4 space-y-2">
        {status.opponentFailedCheck && !cracked && (
          <StatusBanner tone="good">
            Their bot failed the helpfulness test, so it's already broken. Keep yours safe and this match is yours!
          </StatusBanner>
        )}
        {cracked && (
          <StatusBanner tone="good" waiting className="text-base font-medium">
            Password cracked! Sit tight until the round ends
          </StatusBanner>
        )}
      </div>

      <div className="space-y-4">
        {!cracked && (
          <>
            <AttackHintsPanel />
            <AttackChatPanel key={attack.attempt} attack={attack} disabled={cracked} onAttackChange={setLocalAttack} />
          </>
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
