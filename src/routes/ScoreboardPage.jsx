import { useScoreboard } from '../hooks/useScoreboard.js';
import RoundHistoryList from '../components/RoundHistoryList.jsx';
import Timer from '../components/Timer.jsx';
import { PHASE_LABELS } from '../lib/format.js';

export default function ScoreboardPage() {
  const { data: board, loading } = useScoreboard();

  if (loading || !board) {
    return <div className="p-16 text-center text-4xl text-slate-400">Loading scoreboard...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="mb-2 text-5xl font-black tracking-tight">Prompt Injection CTF</h1>
      <p className="mb-8 flex items-baseline gap-4 text-3xl font-semibold text-indigo-300">
        {PHASE_LABELS[board.state]}
        {board.phaseEndsAt && <Timer endsAt={board.phaseEndsAt} className="text-3xl" />}
      </p>

      {board.state === 'game_ended' ? (
        <div className="mb-10 rounded-2xl border border-emerald-700 bg-emerald-900/30 p-8 text-center">
          <p className="text-2xl text-emerald-200">
            {board.finalResult === 'draw' ? 'Final result: Draw' : 'Winner'}
          </p>
          {board.finalResult !== 'draw' && (
            <p className="mt-2 text-6xl font-black text-emerald-100">
              {board.teams?.[board.winnerTeamId]?.name || board.winnerTeamId}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-10 grid grid-cols-2 gap-6 text-center">
          {Object.entries(board.teams || {}).map(([teamId, team]) => (
            <div key={teamId} className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <p className="text-4xl font-bold">{team.name}</p>
            </div>
          ))}
        </div>
      )}

      <RoundHistoryList rounds={board.rounds} teams={board.teams} />
    </div>
  );
}
