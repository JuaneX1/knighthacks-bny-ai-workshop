import AnimatedDots from './AnimatedDots.jsx';

export default function StatusBanner({ children, tone = 'info', waiting = false, className = '' }) {
  const tones = {
    info: 'bg-panel text-ink border-brand-blue/30',
    warn: 'bg-brand-warn/10 text-brand-warn border-brand-warn/40',
    good: 'bg-brand-success/10 text-brand-success border-brand-success/40',
    bad: 'bg-brand-error/10 text-brand-error border-brand-error/40',
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
