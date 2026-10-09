import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import { api } from '../lib/api.js';
import Timer, { TimeUpNotice } from '../components/Timer.jsx';
import { useTeamTheme } from '../hooks/useTeamTheme.js';
import { useAnnouncePhase } from '../lib/phaseAnnouncer.js';
import TeamBadge from '../components/TeamBadge.jsx';
import TeamName from '../components/TeamName.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import VaultEditorForm from '../components/VaultEditorForm.jsx';
import HelpfulnessResult from '../components/HelpfulnessResult.jsx';
import TestChatPanel from '../components/TestChatPanel.jsx';
import ShieldIcon from '../components/icons/ShieldIcon.jsx';
import { roundTitle } from '../lib/format.js';

const BLANK_VAULT = { systemPrompt: '', jobDescription: '' };

function vaultFields(v) {
  return { systemPrompt: v?.systemPrompt || '', jobDescription: v?.jobDescription || '' };
}

export default function DefendPage() {
  const { data: status, error: statusError } = useGameStatus();
  const [vault, setVault] = useState(BLANK_VAULT);
  const [savedVault, setSavedVault] = useState(BLANK_VAULT);
  // The result from our own last "Save & test", so it shows instantly instead of on the next poll.
  const [recentCheck, setRecentCheck] = useState(undefined);
  const [carriedOver, setCarriedOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
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
    if (status.state === 'attack') navigate('/attack');
    // The admin can end a round (or the game) before this page ever sees the attack phase.
    if (['round_ended', 'game_ended'].includes(status.state)) navigate('/waiting');
    if (status.roundNumber && status.roundNumber !== loadedRound) {
      const fields = vaultFields(status.myVault);
      setLoadedRound(status.roundNumber);
      setVault(fields);
      setSavedVault(fields);
      setRecentCheck(undefined);
      setSaveMsg(null);
      setCarriedOver(status.roundNumber > 1 && Boolean(fields.systemPrompt || fields.jobDescription));
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

  if (status.state !== 'draft') {
    return (
      <Centered>
        <StatusBanner>
          The Defend phase isn't on right now.{' '}
          <a href="/waiting" className="text-brand-blue underline">
            Go to the waiting screen
          </a>
        </StatusBanner>
      </Centered>
    );
  }

  const unsaved =
    vault.systemPrompt !== savedVault.systemPrompt || vault.jobDescription !== savedVault.jobDescription;
  const check = recentCheck !== undefined ? recentCheck : status.myVault?.check || null;

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    const toSave = { ...vault };
    try {
      const result = await api.saveAndTestVault(toSave);
      setSavedVault(toSave);
      setRecentCheck(result.check || null);
    } catch (err) {
      // The server saves before testing, so "Saved..." errors mean only the test didn't run.
      if (err.message.startsWith('Saved')) {
        setSavedVault(toSave);
        setRecentCheck(null);
      }
      setSaveMsg({ id: Date.now(), tone: err.message.startsWith('Saved') ? 'warn' : 'bad', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <TeamBadge status={status} />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="heading-glow flex items-center gap-2 text-2xl font-bold">
          <ShieldIcon className="h-6 w-6 text-brand-blue drop-shadow-[0_0_6px_rgb(var(--color-blue)/0.6)]" />
          {roundTitle(status)}: Build your bot
        </h1>
        <Timer endsAt={status.phaseEndsAt} className="text-xl" />
      </div>
      <TimeUpNotice endsAt={status.phaseEndsAt}>
        Time's up! Finish your changes, the admin will start the attack phase shortly
      </TimeUpNotice>
      <p className="mb-6 text-brand-blue/50">
        <TeamName teamId={status.opponentTeamId} name={status.opponentName} className="font-semibold" /> will chat
        with your bot and try to trick it into saying the password. Keep the password safe, but your bot still has to do its job. A bot that refuses to help anyone fails the test and counts as broken.
      </p>

      {carriedOver && (
        <div className="mb-4">
          <StatusBanner>We kept your bot from last round. Change it, or keep it as is.</StatusBanner>
        </div>
      )}

      <VaultEditorForm vault={vault} onChange={setVault} onSave={handleSave} saving={saving} disabled={false} />

      <div className="mt-4 space-y-2">
        {saveMsg && (
          <StatusBanner key={saveMsg.id} tone={saveMsg.tone}>
            {saveMsg.text}
          </StatusBanner>
        )}
        {!saving && <HelpfulnessResult check={check} unsaved={unsaved} />}
      </div>

      <div className="mt-6">
        <TestChatPanel vault={vault} disabled={false} />
      </div>
    </div>
  );
}

function Centered({ children }) {
  return <div className="mx-auto max-w-lg px-6 py-16">{children}</div>;
}
