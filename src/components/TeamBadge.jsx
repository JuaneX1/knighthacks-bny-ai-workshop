import TeamIcon from './icons/TeamIcon.jsx';

// "Which team am I?" chip at the top of each player screen.
export default function TeamBadge({ status }) {
  if (!status?.teamId) return null;
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/40 bg-brand-blue/10 py-1 pl-2 pr-3 text-sm font-semibold text-brand-blue motion-safe:animate-fade-in-up">
      <TeamIcon teamId={status.teamId} className="h-4 w-4" />
      {status.teamName}
    </div>
  );
}
