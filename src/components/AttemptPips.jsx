// One dot per attempt. The most recently used dot gets a new key so it remounts and pops once.
export default function AttemptPips({ used, total = 3 }) {
  return (
    <span className="flex items-center gap-1.5" role="img" aria-label={`${used} of ${total} attempts used`}>
      {Array.from({ length: total }, (_, i) => {
        const isUsed = i < used;
        const justUsed = i === used - 1;
        return (
          <span
            key={justUsed ? `${i}-used` : i}
            className={`h-3 w-3 rounded-full border transition-colors duration-300 ${
              isUsed ? 'border-slate-600 bg-slate-700' : 'border-indigo-400 bg-indigo-500'
            } ${justUsed ? 'motion-safe:animate-pop' : ''}`}
          />
        );
      })}
    </span>
  );
}
