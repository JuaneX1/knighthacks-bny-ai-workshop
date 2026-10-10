import TeamIcon from './icons/TeamIcon.jsx';
import ScrambleText from './ScrambleText.jsx';

// Full-screen sweep of the team's color right after joining: "You're on Team SPARK".
export default function TeamReveal({ teamId, teamName }) {
  return (
    <div
      role="status"
      className={`${teamId} fixed inset-0 z-[10001] flex flex-col items-center justify-center gap-4 bg-team px-6 text-center text-void motion-safe:animate-reveal-sweep motion-safe:[animation-duration:900ms]`}
    >
      <TeamIcon teamId={teamId} className="h-24 w-24 motion-safe:animate-slam-in [animation-delay:500ms] [animation-duration:800ms]" />
      <p className="text-sm font-semibold uppercase tracking-[0.3em] opacity-80 motion-safe:animate-fade-in-up [animation-delay:900ms] [animation-duration:600ms]">
        You're on team
      </p>
      <h2 className="text-5xl font-black uppercase tracking-wide motion-safe:animate-slam-in [animation-delay:1200ms] [animation-duration:800ms] sm:text-6xl">
        <ScrambleText text={teamName} delayMs={1200} durationMs={1200} />
      </h2>
      <p className="text-sm font-semibold opacity-80 motion-safe:animate-fade-in-up [animation-delay:2600ms] [animation-duration:600ms]">
        Nobody gets your password.
      </p>
    </div>
  );
}
