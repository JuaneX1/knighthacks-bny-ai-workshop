import AnimatedDots from './AnimatedDots.jsx';

export default function StatusBanner({ children, tone = 'info', waiting = false, className = '' }) {
  const tones = {
    info: 'bg-slate-800 text-slate-200 border-slate-700',
    warn: 'bg-amber-900/40 text-amber-200 border-amber-700',
    good: 'bg-emerald-900/40 text-emerald-200 border-emerald-700',
    bad: 'bg-red-900/40 text-red-200 border-red-700',
  };
  return (
    <div
      role={waiting ? 'status' : undefined}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm motion-safe:animate-fade-in-up ${tones[tone]} ${className}`}
    >
      {waiting && (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
        </span>
      )}
      <span className="flex-1">
        {children}
        {waiting && <AnimatedDots className="ml-2" />}
      </span>
    </div>
  );
}
