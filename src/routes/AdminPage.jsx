import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useScoreboard } from '../hooks/useScoreboard.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import MessageLog from '../components/MessageLog.jsx';
import { PHASE_LABELS } from '../lib/format.js';

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('ctf_admin_token') || '');
  const [tokenInput, setTokenInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState(null);
  const [teamsForm, setTeamsForm] = useState([
    { teamId: 'team-alpha', name: 'Team Alpha', joinCode: 'ALPHA' },
    { teamId: 'team-bravo', name: 'Team Bravo', joinCode: 'BRAVO' },
  ]);
  const [durations, setDurations] = useState({ draftDurationSec: 300, attackDurationSec: 300 });
  const [log, setLog] = useState(null);
  const { data: board } = useScoreboard({ enabled: verified });

  useEffect(() => {
    if (!adminToken) return;
    api.admin
      .listTeams(adminToken)
      .then(() => setVerified(true))
      .catch(() => setVerified(false));
  }, [adminToken]);

  function handleTokenSubmit(e) {
    e.preventDefault();
    sessionStorage.setItem('ctf_admin_token', tokenInput);
    setAdminToken(tokenInput);
  }

  function act(fn) {
    return async () => {
      setMessage(null);
      try {
        await fn();
        setMessage({ tone: 'good', text: 'Done.' });
      } catch (err) {
        setMessage({ tone: 'bad', text: err.message });
      }
    };
  }

  async function loadLog() {
    try {
      const data = await api.admin.log(adminToken);
      setLog(data);
    } catch (err) {
      setMessage({ tone: 'bad', text: err.message });
    }
  }

  if (!verified) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16">
        <h1 className="mb-4 text-2xl font-bold">Admin login</h1>
        <form onSubmit={handleTokenSubmit} className="space-y-3">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
          />
          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500">
            Enter
          </button>
        </form>
        {adminToken && <p className="mt-3 text-sm text-red-400">Invalid token, try again.</p>}
      </div>
    );
  }

  const teams = board?.teams || {};

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="text-right">
          <p className="text-lg font-semibold">{board ? PHASE_LABELS[board.state] : '...'}</p>
          {board?.rounds?.[0] && board.state !== 'lobby' && board.state !== 'game_ended' && (
            <p className="text-sm text-slate-400">Round {board.roundNumber}</p>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <StatusBanner tone={message.tone}>{message.text}</StatusBanner>
        </div>
      )}

      <Section title="Teams">
        <div className="space-y-2">
          {teamsForm.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={t.teamId}
                onChange={(e) => updateTeam(i, 'teamId', e.target.value)}
                placeholder="teamId"
                className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              />
              <input
                value={t.name}
                onChange={(e) => updateTeam(i, 'name', e.target.value)}
                placeholder="Display name"
                className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              />
              <input
                value={t.joinCode}
                onChange={(e) => updateTeam(i, 'joinCode', e.target.value)}
                placeholder="Join code"
                className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
        <Button onClick={act(() => api.admin.setTeams(teamsForm, adminToken))}>Save teams</Button>
      </Section>

      <Section title="Round control">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-400">
            Draft sec
            <input
              type="number"
              value={durations.draftDurationSec}
              onChange={(e) => setDurations((d) => ({ ...d, draftDurationSec: Number(e.target.value) }))}
              className="ml-2 w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm text-slate-400">
            Attack sec
            <input
              type="number"
              value={durations.attackDurationSec}
              onChange={(e) => setDurations((d) => ({ ...d, attackDurationSec: Number(e.target.value) }))}
              className="ml-2 w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={act(() => api.admin.roundStart(durations, adminToken))}>Start next round</Button>
          <Button onClick={act(() => api.admin.phaseAttack(adminToken))}>Force attack phase now</Button>
          <Button onClick={act(() => api.admin.phaseEnd(adminToken))}>Force end attack phase now</Button>
          <Button onClick={act(() => api.admin.timer(durations, adminToken))}>Update default durations</Button>
        </div>
        {(board?.state === 'draft' || board?.state === 'attack') && (
          <p className="mt-2 text-sm text-slate-400">
            Time remaining: <Timer endsAt={board.phaseEndsAt} />
          </p>
        )}
      </Section>

      <Section title="End game">
        <div className="flex flex-wrap gap-2">
          {Object.entries(teams).map(([teamId, t]) => (
            <Button key={teamId} onClick={act(() => api.admin.endGame({ result: teamId }, adminToken))}>
              Declare {t.name} winner
            </Button>
          ))}
          <Button onClick={act(() => api.admin.endGame({ result: 'draw' }, adminToken))}>Declare draw</Button>
        </div>
      </Section>

      <Section title="Danger zone">
        <Button
          tone="bad"
          onClick={act(async () => {
            if (!confirm('This wipes all round data. Continue?')) return;
            await api.admin.reset(adminToken);
          })}
        >
          Reset game
        </Button>
      </Section>

      <Section title="Debrief log">
        <Button onClick={loadLog}>Load full log</Button>
        <div className="mt-4">
          <MessageLog log={log} teams={teams} />
        </div>
      </Section>
    </div>
  );

  function updateTeam(i, field, value) {
    setTeamsForm((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }
}

function Section({ title, children }) {
  return (
    <div className="mb-8 rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Button({ children, onClick, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-700 hover:bg-slate-600',
    bad: 'bg-red-800 hover:bg-red-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-2 text-sm font-medium text-white transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
