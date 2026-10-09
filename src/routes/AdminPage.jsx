import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useScoreboard } from '../hooks/useScoreboard.js';
import { usePolling } from '../hooks/usePolling.js';
import Timer from '../components/Timer.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import MessageLog from '../components/MessageLog.jsx';
import Bracket from '../components/Bracket.jsx';
import { PHASE_LABELS, STAGE_LABELS, matchLabel } from '../lib/format.js';
import { TEAM_IDS, teamCountFor } from '../../lib/keys.js';

const LOG_INTERVAL_MS = 5000;

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('ctf_admin_token') || '');
  const [tokenInput, setTokenInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState(null);
  const [teamsForm, setTeamsForm] = useState([
    { name: 'Team SPARK', joinCode: 'SPARK' },
    { name: 'Team THRIVE', joinCode: 'THRIVE' },
    { name: 'Team OWN IT', joinCode: 'OWNIT' },
    { name: 'Team CURIOUS', joinCode: 'CURIOUS' },
  ]);
  const [durations, setDurations] = useState({ draftDurationSec: 300, attackDurationSec: 600, promptsPerAttempt: 8 });
  const [log, setLog] = useState(null);
  const [logLive, setLogLive] = useState(false);
  const { data: board } = useScoreboard({ enabled: verified });
  // While "Live" is on, the debrief log re-fetches every few seconds so new messages and guesses show up.
  const { data: liveLog } = usePolling(() => api.admin.log(adminToken), LOG_INTERVAL_MS, { enabled: verified && logLive });

  useEffect(() => {
    if (logLive && liveLog) setLog(liveLog);
  }, [logLive, liveLog]);

  useEffect(() => {
    if (!adminToken) return;
    api.admin
      .listTeams(adminToken)
      .then(({ teams }) => {
        setVerified(true);
        const saved = Object.fromEntries(teams.map(({ teamId, name, joinCode }) => [teamId, { name, joinCode }]));
        setTeamsForm((prev) => TEAM_IDS.map((teamId, i) => saved[teamId] || prev[i]));
      })
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
        <h1 className="heading-glow mb-4 text-2xl font-bold">Admin login</h1>
        <form onSubmit={handleTokenSubmit} className="space-y-3">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="ui-input w-full"
          />
          <button type="submit" className="btn-primary w-full">
            Enter
          </button>
        </form>
        {adminToken && <p className="mt-3 text-sm text-brand-error">Invalid token, try again.</p>}
      </div>
    );
  }

  const teams = board?.teams || {};
  const mode = board?.mode || 'duel';
  const visibleTeams = teamsForm.slice(0, teamCountFor(mode));
  const drawnSemis =
    board?.stage === 'semis' && board.state === 'round_ended'
      ? board.matches.map((pair, i) => ({ pair, i })).filter(({ i }) => !board.finalists[i])
      : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-glow text-2xl font-bold">Admin</h1>
        <div className="text-right">
          <p className="text-lg font-semibold text-brand-blue">
            {STAGE_LABELS[board?.stage] && board.state !== 'game_ended' && `${STAGE_LABELS[board.stage]}: `}
            {board ? PHASE_LABELS[board.state] : '...'}
          </p>
          {board?.rounds?.[0] && board.state !== 'lobby' && board.state !== 'game_ended' && (
            <p className="text-sm text-brand-blue/50">Round {board.roundNumber}</p>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <StatusBanner tone={message.tone}>{message.text}</StatusBanner>
        </div>
      )}

      <Section title="Mode">
        <div className="flex flex-wrap gap-2">
          <Button tone={mode === 'duel' ? 'active' : 'default'} onClick={act(() => api.admin.setMode('duel', adminToken))}>
            Duel (2 teams)
          </Button>
          <Button
            tone={mode === 'tournament' ? 'active' : 'default'}
            onClick={act(() => api.admin.setMode('tournament', adminToken))}
          >
            Tournament (4 teams)
          </Button>
        </div>
        <p className="mt-2 text-xs text-brand-blue/40">
          Duel: rounds repeat until one team wins. Tournament: semifinals (Team 1 vs 2, Team 3 vs 4) at the same time,
          then a final between the winners. Switching is only allowed before the first round (reset first).
        </p>
      </Section>

      <Section title="Teams">
        <div className="space-y-2">
          {visibleTeams.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-sm text-brand-blue/50">Team {i + 1}</span>
              <input
                value={t.name}
                onChange={(e) => updateTeam(i, 'name', e.target.value)}
                placeholder="Display name"
                className="ui-input flex-1 py-1 text-sm"
              />
              <input
                value={t.joinCode}
                onChange={(e) => updateTeam(i, 'joinCode', e.target.value)}
                placeholder="Join code"
                className="ui-input w-32 py-1 text-sm"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-brand-blue/40">
          This mode uses exactly {visibleTeams.length} teams. Renaming or changing a join code is safe at any time.
        </p>
        <div className="mt-3">
          <Button onClick={act(() => api.admin.setTeams(visibleTeams, adminToken))}>Save teams</Button>
        </div>
      </Section>

      <Section title="Round control">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-brand-blue/50">
            Draft sec
            <input
              type="number"
              value={durations.draftDurationSec}
              onChange={(e) => setDurations((d) => ({ ...d, draftDurationSec: Number(e.target.value) }))}
              className="ui-input ml-2 w-20 py-1 text-sm"
            />
          </label>
          <label className="text-sm text-brand-blue/50">
            Attack sec
            <input
              type="number"
              value={durations.attackDurationSec}
              onChange={(e) => setDurations((d) => ({ ...d, attackDurationSec: Number(e.target.value) }))}
              className="ui-input ml-2 w-20 py-1 text-sm"
            />
          </label>
          <label className="text-sm text-brand-blue/50">
            Messages per try
            <input
              type="number"
              min={1}
              max={20}
              value={durations.promptsPerAttempt}
              onChange={(e) => setDurations((d) => ({ ...d, promptsPerAttempt: Number(e.target.value) }))}
              className="ui-input ml-2 w-16 py-1 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={act(() => api.admin.roundStart(durations, adminToken))}>{startLabel(board)}</Button>
          <Button onClick={act(() => api.admin.phaseAttack(adminToken))}>Force attack phase now</Button>
          <Button onClick={act(() => api.admin.phaseEnd(adminToken))}>Force end attack phase now</Button>
          <Button onClick={act(() => api.admin.timer(durations, adminToken))}>Update default settings</Button>
        </div>
        {(board?.state === 'draft' || board?.state === 'attack') && (
          <p className="mt-2 text-sm text-brand-blue/50">
            Time remaining: <Timer endsAt={board.phaseEndsAt} />
          </p>
        )}
      </Section>

      {mode === 'tournament' && board && (
        <Section title="Bracket">
          <Bracket semis={board.lineup} finalists={board.finalists} winnerTeamId={board.winnerTeamId} teams={teams} />
          {drawnSemis.map(({ pair, i }) => (
            <div key={i} className="mt-4">
              <p className="mb-2 text-sm text-brand-blue/50">
                Semifinal {i + 1} ({matchLabel(pair, teams)}) was a draw. Who goes through?
              </p>
              <div className="flex flex-wrap gap-2">
                {pair.map((teamId) => (
                  <Button key={teamId} onClick={act(() => api.admin.advance(i, teamId, adminToken))}>
                    Advance {teams[teamId]?.name || teamId}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section title="End game">
        <div className="flex flex-wrap gap-2">
          {(board?.lineup || []).flat().map((teamId) => (
            <Button key={teamId} onClick={act(() => api.admin.endGame({ result: teamId }, adminToken))}>
              Declare {teams[teamId]?.name || teamId} winner
            </Button>
          ))}
          <Button onClick={act(() => api.admin.endGame({ result: 'draw' }, adminToken))}>Declare draw</Button>
        </div>
      </Section>

      <Section title="Danger zone">
        <Button
          tone="bad"
          onClick={act(async () => {
            if (!confirm('This wipes all round data and every team\'s saved bot, and signs all teams out. Continue?')) return;
            await api.admin.reset(adminToken);
          })}
        >
          Reset game
        </Button>
      </Section>

      <Section title="Debrief log">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={loadLog}>{log ? 'Refresh log' : 'Load full log'}</Button>
          <label className="flex items-center gap-2 text-sm text-brand-blue/60">
            <input type="checkbox" checked={logLive} onChange={(e) => setLogLive(e.target.checked)} />
            Live (updates every {LOG_INTERVAL_MS / 1000}s)
          </label>
        </div>
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

// The round-start button's label for what it will start next.
function startLabel(board) {
  if (board?.mode !== 'tournament') return 'Start next round';
  return board.stage ? 'Start final' : 'Start semifinals';
}

function Section({ title, children }) {
  return (
    <div className="ui-panel mb-8 p-4">
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function Button({ children, onClick, tone = 'default' }) {
  const tones = {
    default: 'border border-brand-blue/30 bg-panel text-ink hover:border-brand-blue/60 hover:bg-panel/60',
    active: 'border border-brand-blue bg-brand-blue/20 text-ink',
    bad: 'bg-brand-error/80 text-btn-ink hover:bg-brand-error hover:shadow-[0_0_14px_rgb(var(--color-error)/0.55)]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-2 text-sm font-medium transition ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
