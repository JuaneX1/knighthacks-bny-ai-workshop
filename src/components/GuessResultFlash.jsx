import { useEffect } from 'react';
import ScrambleText from './ScrambleText.jsx';

const SHOW_MS = { correct: 2600, wrong: 1500 };

// Full-screen verdict after a guess, so a hit or a miss lands like a game-show reveal.
export default function GuessResultFlash({ result, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SHOW_MS[result.correct ? 'correct' : 'wrong']);
    return () => clearTimeout(timer);
  }, [result, onDone]);

  const tone = result.correct ? 'bg-brand-success' : 'bg-brand-error';

  return (
    <div
      role="alert"
      onClick={onDone}
      className={`fixed inset-0 z-[10001] flex cursor-pointer flex-col items-center justify-center gap-5 px-6 text-center text-btn-ink ${tone} motion-safe:animate-reveal-sweep`}
    >
      <p className="rounded-md border-4 border-current px-5 py-2 text-4xl font-black uppercase tracking-[0.15em] motion-safe:animate-stamp [animation-delay:250ms] sm:text-6xl">
        {result.correct ? 'Access granted' : 'Access denied'}
      </p>
      {result.correct ? (
        <ScrambleText text={result.guess} delayMs={600} durationMs={900} className="font-mono text-2xl font-bold sm:text-3xl" />
      ) : (
        <p className="text-lg font-semibold motion-safe:animate-fade-in-up [animation-delay:500ms]">
          "{result.guess}" bounced off. Fresh chat incoming.
        </p>
      )}
    </div>
  );
}
