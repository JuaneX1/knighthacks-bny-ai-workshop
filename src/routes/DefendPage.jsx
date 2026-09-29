import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStatus } from '../hooks/useGameStatus.js';
import { api } from '../lib/api.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import VaultEditorForm from '../components/VaultEditorForm.jsx';
import TestChatPanel from '../components/TestChatPanel.jsx';

const BLANK_VAULT = { systemPrompt: '', jobDescription: '', filterMode: 'none', filterRegexList: [] };

export default function DefendPage() {
  const { data: status, error: statusError } = useGameStatus();
  const [vault, setVault] = useState(BLANK_VAULT);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [loadedRound, setLoadedRound] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (statusError?.status === 401) navigate('/');
  }, [statusError, navigate]);

  useEffect(() => {
    if (!status) return;
    if (status.state === 'attack') navigate('/attack');
    if (status.roundNumber && status.roundNumber !== loadedRound) {
      setLoadedRound(status.roundNumber);
      if (status.myVault) {
        setVault({
          systemPrompt: status.myVault.systemPrompt || '',
          jobDescription: status.myVault.jobDescription || '',
          filterMode: status.myVault.filterMode || 'none',
          filterRegexList: status.myVault.filterRegexList || [],
        });
      } else {
        setVault(BLANK_VAULT);
      }
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

  if (status.state !== 'draft') {
    return (
      <Centered>
        <StatusBanner>
          Draft phase isn't active right now (currently: {status.state}).{' '}
          <a href="/waiting" className="underline">Go to waiting screen</a>
        </StatusBanner>
      </Centered>
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.saveVault(vault);
      setSaveMsg({ tone: 'good', text: 'Vault saved.' });
    } catch (err) {
      setSaveMsg({ tone: 'bad', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Defend your vault - Round {status.roundNumber}</h1>
        <Timer endsAt={status.phaseEndsAt} className="text-xl" />
      </div>

      <VaultEditorForm vault={vault} onChange={setVault} onSave={handleSave} saving={saving} disabled={false} />

      {saveMsg && (
        <div className="mt-4">
          <StatusBanner tone={saveMsg.tone}>{saveMsg.text}</StatusBanner>
        </div>
      )}

      <div className="mt-6">
        <TestChatPanel vault={vault} disabled={false} />
      </div>
    </div>
  );
}

function Centered({ children }) {
  return <div className="mx-auto max-w-lg px-6 py-16">{children}</div>;
}
