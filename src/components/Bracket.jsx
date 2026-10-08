// Knockout bracket: the two semifinals on the left, the final on the right.
export default function Bracket({ semis, finalists, winnerTeamId, teams }) {
  const finalTeams = [finalists?.[0] || null, finalists?.[1] || null];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center">
      <div className="space-y-4">
        {semis.map((pair, i) => (
          <MatchCard
            key={pair.join('-')}
            label={`Semifinal ${i + 1}`}
            teamIds={pair}
            winnerTeamId={finalists?.[i] || null}
            teams={teams}
          />
        ))}
      </div>
      <MatchCard label="Final" teamIds={finalTeams} winnerTeamId={winnerTeamId} teams={teams} />
    </div>
  );
}

// One match box; the winner is highlighted and the loser dimmed once there's a result.
function MatchCard({ label, teamIds, winnerTeamId, teams }) {
  return (
    <div className="ui-panel p-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-brand-blue/50">{label}</p>
      {teamIds.map((id, i) => (
        <p key={id || i} className={`text-xl font-bold ${teamTone(id, winnerTeamId)}`}>
          {id ? teams?.[id]?.name || id : 'TBD'}
        </p>
      ))}
    </div>
  );
}

// Text color for a team line in a match box.
function teamTone(teamId, winnerTeamId) {
  if (!teamId) return 'text-brand-blue/30';
  if (!winnerTeamId) return 'text-ink';
  return teamId === winnerTeamId ? 'text-brand-success' : 'text-ink/40';
}
