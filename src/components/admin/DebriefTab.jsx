import { useState } from 'react';
import MessageLog from '../MessageLog.jsx';
import Spinner from '../Spinner.jsx';
import { api } from '../../lib/api.js';

// Every round's bots, chats and guesses, for walking through what happened after the game.
export default function DebriefTab({ adminToken, teams, notify }) {
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roundFilter, setRoundFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');

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
          Loads every bot, the messages it received and the guesses made against it. Best used after the game.
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
