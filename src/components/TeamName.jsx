import TeamIcon from './icons/TeamIcon.jsx';

// A team's name with its icon, in its team color. Pass the scoreboard's `teams` map, or `name` directly.
export default function TeamName({ teamId, teams, name, className = '', iconClassName = 'h-[1em] w-[1em]' }) {
  const label = name || teams?.[teamId]?.name || teamId;
  return (
    <span className={`${teamId} inline-flex items-center gap-[0.35em] align-bottom text-team ${className}`}>
      <TeamIcon teamId={teamId} className={`shrink-0 ${iconClassName}`} />
      {label}
    </span>
  );
}
