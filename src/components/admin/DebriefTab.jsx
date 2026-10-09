import { useEffect, useState } from 'react';
import MessageLog from '../MessageLog.jsx';
import Spinner from '../Spinner.jsx';
import { api } from '../../lib/api.js';
import { usePolling } from '../../hooks/usePolling.js';

const LIVE_INTERVAL_MS = 5000;

// Every round's bots, chats and guesses, for walking through what happened after the game.
export default function DebriefTab({ adminToken, teams, notify }) {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roundFilter, setRoundFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [live, setLive] = useState(false);
  // While "Live" is on, the log re-fetches every few seconds so new messages and guesses show up.
  const { data: liveLog } = usePolling(() => api.admin.log(adminToken), LIVE_INTERVAL_MS, { enabled: live });

  useEffect(() => {
    if (live && liveLog) setLog(liveLog);
  }, [live, liveLog]);

  async function load() {
    setLoading(true);
    try {
      setLog(await api.admin.log(adminToken));
    } catch (err) {
      notify('bad', err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = log && {
    ...log,
    rounds: log.rounds
      .filter((r) => roundFilter === 'all' || String(r.roundNumber) === roundFilter)
      .map((r) => ({
        ...r,
        teams: Object.fromEntries(Object.entries(r.teams).filter(([teamId]) => teamFilter === 'all' || teamId === teamFilter)),
      })),
  };
  const teamIds = log ? [...new Set(log.rounds.flatMap((r) => Object.keys(r.teams)))] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" onClick={load} disabled={loading} className="btn-primary py-2 text-sm">
          {loading && <Spinner />}
          {log ? 'Refresh log' : 'Load full log'}
        </button>
        <label className="flex items-center gap-2 pb-2 text-sm text-brand-blue/60">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Live (updates every {LIVE_INTERVAL_MS / 1000}s)
        </label>
        {log && (
          <>
            <Select label="Round" value={roundFilter} onChange={setRoundFilter}>
              <option value="all">All rounds</option>
              {log.rounds.map((r) => (
                <option key={r.roundNumber} value={String(r.roundNumber)}>
                  Round {r.roundNumber}
                </option>
              ))}
            </Select>
            <Select label="Team" value={teamFilter} onChange={setTeamFilter}>
              <option value="all">All teams</option>
              {teamIds.map((id) => (
                <option key={id} value={id}>
                  {teams?.[id]?.name || id}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>
      {!log && !loading && (
        <p className="text-sm text-brand-blue/50">
          Loads every bot, the messages each team sent and the guesses it made. Tick Live to watch a round as it happens.
        </p>
      )}
      <MessageLog log={filtered} teams={teams} />
    </div>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="text-xs uppercase tracking-widest text-brand-blue/50">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="ui-input mt-1 block py-1.5 text-sm normal-case tracking-normal">
        {children}
      </select>
    </label>
  );
}
