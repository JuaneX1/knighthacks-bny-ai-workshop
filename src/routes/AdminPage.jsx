import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useScoreboard } from '../hooks/useScoreboard.js';
import { usePolling } from '../hooks/usePolling.js';
import { useNow } from '../hooks/useNow.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import BrandEmblem from '../components/icons/BrandEmblem.jsx';
import ControlBar from '../components/admin/ControlBar.jsx';
import LiveTab from '../components/admin/LiveTab.jsx';
import SetupTab from '../components/admin/SetupTab.jsx';
import DebriefTab from '../components/admin/DebriefTab.jsx';
import ResetDialog from '../components/admin/ResetDialog.jsx';
import { Toasts, useToasts } from '../components/admin/Toasts.jsx';
import { TEAM_IDS, teamCountFor } from '../../lib/keys.js';

const DEFAULT_TEAMS = [
  { name: 'Team SPARK', joinCode: 'SPARK' },
  { name: 'Team THRIVE', joinCode: 'THRIVE' },
  { name: 'Team OWN IT', joinCode: 'OWNIT' },
  { name: 'Team CURIOUS', joinCode: 'CURIOUS' },
];

const TABS = [
  { id: 'live', label: 'Live' },
  { id: 'setup', label: 'Setup' },
  { id: 'debrief', label: 'Debrief' },
];

const POLL_MS = 3000;
const DEFAULT_SETTINGS = { draftDurationSec: 300, attackDurationSec: 600, promptsPerAttempt: 8 };

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('ctf_admin_token') || '');
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(Boolean(adminToken));

  // The teams as last saved on the server, in slot order, to tell when the form has unsaved edits.
  const [savedTeams, setSavedTeams] = useState([]);
  const [teamsForm, setTeamsForm] = useState(DEFAULT_TEAMS);

  useEffect(() => {
    if (!adminToken) return;
    setChecking(true);
    api.admin
      .listTeams(adminToken)
      .then(({ teams }) => {
        setVerified(true);
        const saved = Object.fromEntries(teams.map(({ teamId, name, joinCode }) => [teamId, { name, joinCode }]));
        setTeamsForm(TEAM_IDS.map((teamId, i) => saved[teamId] || DEFAULT_TEAMS[i]));
        setSavedTeams(teams.map(({ name, joinCode }) => ({ name, joinCode })));
      })
      .catch(() => setVerified(false))
      .finally(() => setChecking(false));
  }, [adminToken]);

  function handleLogin(token) {
    sessionStorage.setItem('ctf_admin_token', token);
    setAdminToken(token);
  }

  if (!verified) {
    if (checking) return <LoadingScreen label="Checking token" />;
    return <AdminLogin onSubmit={handleLogin} failed={Boolean(adminToken)} />;
  }

  return (
    <AdminDashboard
      adminToken={adminToken}
      teamsForm={teamsForm}
      setTeamsForm={setTeamsForm}
      savedTeams={savedTeams}
      setSavedTeams={setSavedTeams}
    />
  );
}

function AdminDashboard({ adminToken, teamsForm, setTeamsForm, savedTeams, setSavedTeams }) {
  const [tab, setTab] = useState(() => readTab());
  const [busy, setBusy] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const { toasts, notify, dismiss } = useToasts();
  const now = useNow();

  const { data: board, refresh: refreshBoard } = useScoreboard({ intervalMs: POLL_MS });
  const {
    data: overview,
    error: overviewError,
    refresh: refreshOverview,
  } = usePolling(() => api.admin.overview(adminToken), POLL_MS);

  // Round settings start from what the server has saved (or the defaults if that can't load),
  // then the admin's edits take over.
  useEffect(() => {
    if (settings || (!overview && !overviewError)) return;
    const s = overview?.settings || DEFAULT_SETTINGS;
    setSettings({
      draftMin: s.draftDurationSec / 60,
      attackMin: s.attackDurationSec / 60,
      promptsPerAttempt: s.promptsPerAttempt,
    });
  }, [overview, overviewError, settings]);

  // Runs an admin action, then confirms it (or shows why it failed) and refreshes the dashboard.
  const run = useCallback(
    async (action, successText, busyLabel = successText) => {
      setBusy(busyLabel);
      try {
        await action(adminToken);
        notify('good', successText);
        refreshBoard();
        refreshOverview();
        return true;
      } catch (err) {
        notify('bad', err.message);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [adminToken, notify, refreshBoard, refreshOverview],
  );

  if (!board || !settings) return <LoadingScreen label="Loading game" />;

  const visibleTeams = teamsForm.slice(0, teamCountFor(board.mode));
  const teamsDirty = JSON.stringify(visibleTeams) !== JSON.stringify(savedTeams.slice(0, visibleTeams.length));
  const roundSettings = {
    draftDurationSec: Math.max(30, Math.round(Number(settings.draftMin) * 60) || 0),
    attackDurationSec: Math.max(30, Math.round(Number(settings.attackMin) * 60) || 0),
    promptsPerAttempt: Math.min(20, Math.max(1, Math.round(Number(settings.promptsPerAttempt)) || 1)),
  };

  async function saveTeams() {
    const toSave = visibleTeams;
    if (await run((token) => api.admin.setTeams(toSave, token), 'Teams saved')) setSavedTeams(toSave);
  }

  function selectTab(id) {
    setTab(id);
    try {
      sessionStorage.setItem('ctf_admin_tab', id);
    } catch {
      // only a convenience
    }
  }

  return (
    <div className="pb-16">
      <ControlBar
        board={board}
        overview={overview}
        settings={roundSettings}
        run={run}
        busy={busy}
        now={now}
        onReset={() => setResetOpen(true)}
      />

      <div className="mx-auto max-w-6xl px-6">
        {overviewError && (
          <div className="mb-4">
            <StatusBanner tone="bad">
              Couldn't load live team status: {overviewError.message}. If you're running the local API server, restart
              it so it picks up the latest endpoints.
            </StatusBanner>
          </div>
        )}

        <div className="mb-6 flex items-center gap-1 border-b border-brand-blue/20" role="tablist">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => selectTab(id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition ${
                tab === id ? 'border-brand-blue text-ink' : 'border-transparent text-brand-blue/50 hover:text-brand-blue'
              }`}
            >
              {label}
              {id === 'setup' && teamsDirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-warn" title="Unsaved team changes" />
              )}
            </button>
          ))}
        </div>

        {tab === 'live' && (
          <LiveTab board={board} overview={overview} run={run} busy={busy} onReset={() => setResetOpen(true)} />
        )}
        {tab === 'setup' && (
          <SetupTab
            board={board}
            run={run}
            onSaveTeams={saveTeams}
            busy={busy}
            setTeamsForm={setTeamsForm}
            teamsDirty={teamsDirty}
            visibleTeams={visibleTeams}
            settings={settings}
            setSettings={setSettings}
          />
        )}
        {tab === 'debrief' && <DebriefTab adminToken={adminToken} teams={board.teams} notify={notify} />}
      </div>

      {resetOpen && (
        <ResetDialog
          busy={Boolean(busy)}
          onCancel={() => setResetOpen(false)}
          onConfirm={async () => {
            const ok = await run((token) => api.admin.reset(token), 'Game reset. Players need to rejoin', 'Reset');
            if (ok) setResetOpen(false);
          }}
        />
      )}

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function AdminLogin({ onSubmit, failed }) {
  const [token, setToken] = useState('');
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-6 flex items-center gap-3">
        <BrandEmblem className="h-10 w-10" />
        <div>
          <h1 className="heading-glow text-2xl font-bold">Admin</h1>
          <p className="text-xs uppercase tracking-widest text-brand-blue/50">Prompt Wars control room</p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(token);
        }}
        className="space-y-3"
      >
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Admin token"
          autoFocus
          className="ui-input w-full"
        />
        <button type="submit" disabled={!token} className="btn-primary w-full">
          Enter
        </button>
      </form>
      {failed && <p className="mt-3 text-sm text-brand-error">That token didn't work. Try again.</p>}
    </div>
  );
}

function readTab() {
  try {
    const saved = sessionStorage.getItem('ctf_admin_tab');
    return TABS.some((t) => t.id === saved) ? saved : 'live';
  } catch {
    return 'live';
  }
}
