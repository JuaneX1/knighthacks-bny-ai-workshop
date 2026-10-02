import { TEAM_IDS } from '../../lib/keys.js';

export default function RoundHistoryList({ rounds, teams }) {
  if (!rounds || rounds.length === 0) {
    return <p className="text-brand-blue/50">No rounds played yet.</p>;
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <div key={round.roundNumber} className="ui-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Round {round.roundNumber}</h3>
            {round.vaults ? (
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  round.outcome === 'decisive' ? 'bg-brand-success/20 text-brand-success' : 'bg-panel text-ink/70 border border-brand-blue/20'
                }`}
              >
                {round.outcome === 'decisive'
                  ? `${teams?.[round.winnerTeamId]?.name || round.winnerTeamId} won`
                  : 'Draw'}
              </span>
            ) : (
              <span className="rounded border border-brand-blue/20 bg-panel px-2 py-1 text-xs text-ink/70">In progress</span>
            )}
          </div>

          {round.vaults && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {TEAM_IDS.filter((teamId) => teamId in round.vaults).map((teamId) => {
                const vault = round.vaults[teamId];
                return (
                <div key={teamId} className="rounded border border-brand-blue/20 bg-well p-3 text-sm">
                  <p className="font-medium text-ink">{teams?.[teamId]?.name || teamId}</p>
                  {vault ? (
                    <>
                      <p className="mt-1 text-brand-blue/50">
                        Password: <span className="font-mono text-ink/80">{vault.password}</span>
                      </p>
                      <p className="mt-1 text-brand-blue/50">
                        Cracked: {vault.crackedByOpponent ? 'yes' : 'no'}
                      </p>
                      {vault.utilityPassed === false && (
                        <p className="mt-1 text-brand-error">Failed the helpfulness test (counts as broken)</p>
                      )}
                      <p className="mt-2 whitespace-pre-wrap break-words text-ink/70">{vault.systemPrompt}</p>
                    </>
                  ) : (
                    <p className="text-brand-blue/40">No vault submitted.</p>
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
