import { TEAM_IDS } from '../../lib/keys.js';

export default function RoundHistoryList({ rounds, teams }) {
  if (!rounds || rounds.length === 0) {
    return <p className="text-slate-400">No rounds played yet.</p>;
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <div key={round.roundNumber} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Round {round.roundNumber}</h3>
            {round.vaults ? (
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  round.outcome === 'decisive' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {round.outcome === 'decisive'
                  ? `${teams?.[round.winnerTeamId]?.name || round.winnerTeamId} won`
                  : 'Draw'}
              </span>
            ) : (
              <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">In progress</span>
            )}
          </div>

          {round.vaults && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {TEAM_IDS.filter((teamId) => teamId in round.vaults).map((teamId) => {
                const vault = round.vaults[teamId];
                return (
                <div key={teamId} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm">
                  <p className="font-medium text-slate-100">{teams?.[teamId]?.name || teamId}</p>
                  {vault ? (
                    <>
                      <p className="mt-1 text-slate-400">
                        Password: <span className="font-mono text-slate-200">{vault.password}</span>
                      </p>
                      <p className="mt-1 text-slate-400">
                        Cracked: {vault.crackedByOpponent ? 'yes' : 'no'}
                      </p>
                      {vault.utilityPassed === false && (
                        <p className="mt-1 text-red-300">Failed the helpfulness test (counts as broken)</p>
                      )}
                      <p className="mt-2 whitespace-pre-wrap break-words text-slate-300">{vault.systemPrompt}</p>
                    </>
                  ) : (
                    <p className="text-slate-500">No vault submitted.</p>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
