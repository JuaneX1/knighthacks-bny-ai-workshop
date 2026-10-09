import TeamIcon from './icons/TeamIcon.jsx';

// Full-screen sweep of the team's color right after joining: "You're on Team SPARK".
export default function TeamReveal({ teamId, teamName }) {
  return (
    <div
      role="status"
      className={`${teamId} fixed inset-0 z-[10001] flex flex-col items-center justify-center gap-4 bg-team px-6 text-center text-void motion-safe:animate-reveal-sweep`}
    >
      <TeamIcon teamId={teamId} className="h-24 w-24 motion-safe:animate-slam-in [animation-delay:300ms]" />
      <p className="text-sm font-semibold uppercase tracking-[0.3em] opacity-80 motion-safe:animate-fade-in-up [animation-delay:400ms]">
        You're on
      </p>
      <h2 className="text-5xl font-black uppercase tracking-wide motion-safe:animate-slam-in [animation-delay:450ms] sm:text-6xl">
        {teamName}
      </h2>
    </div>
  );
}
