import TeamName from './TeamName.jsx';
import { STAGE_LABELS } from '../lib/format.js';

export default function RoundHistoryList({ rounds, teams }) {
  if (!rounds || rounds.length === 0) {
    return <p className="text-brand-blue/50">No rounds played yet.</p>;
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <div key={round.roundNumber} className="ui-panel p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">
              Round {round.roundNumber}
              {STAGE_LABELS[round.stage] && <span className="text-brand-blue/50"> · {STAGE_LABELS[round.stage]}</span>}
            </h3>
            {round.inProgress && (
              <span className="rounded border border-brand-blue/20 bg-panel px-2 py-1 text-xs text-ink/70">In progress</span>
            )}
          </div>

          {round.results?.map((result) => (
            <MatchResult key={result.teams.join('-')} result={result} vaults={round.vaults} teams={teams} />
          ))}
        </div>
      ))}
    </div>
  );
}

// One match in a sealed round: the result badge and both teams' revealed vaults.
function MatchResult({ result, vaults, teams }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          <TeamName teamId={result.teams[0]} teams={teams} />
          <span className="text-ink/50"> vs </span>
          <TeamName teamId={result.teams[1]} teams={teams} />
        </p>
        {result.winnerTeamId ? (
          <span className={`${result.winnerTeamId} rounded bg-team/15 px-2 py-1 text-xs font-medium text-team`}>
            {teams?.[result.winnerTeamId]?.name || result.winnerTeamId} won
          </span>
        ) : (
          <span className="rounded border border-brand-blue/20 bg-panel px-2 py-1 text-xs font-medium text-ink/70">Draw</span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
        {result.teams.map((teamId) => (
          <VaultCard key={teamId} teamId={teamId} teams={teams} vault={vaults?.[teamId]} />
        ))}
      </div>
    </div>
  );
}

// A team's vault, revealed after the round is sealed.
function VaultCard({ teamId, teams, vault }) {
  return (
    <div className={`${teamId} rounded border border-l-4 border-brand-blue/20 border-l-team/60 bg-well p-3 text-sm`}>
      <TeamName teamId={teamId} teams={teams} className="font-medium" />
      {vault ? (
        <>
          <p className="mt-1 text-brand-blue/50">
            Password: <span className="font-mono text-ink/80">{vault.password}</span>
          </p>
          <p className="mt-1 text-brand-blue/50">Cracked: {vault.crackedByOpponent ? 'yes' : 'no'}</p>
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
}
