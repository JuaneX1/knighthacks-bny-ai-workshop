export default function StatusBanner({ children, tone = 'info' }) {
  const tones = {
    info: 'bg-slate-800 text-slate-200 border-slate-700',
    warn: 'bg-amber-900/40 text-amber-200 border-amber-700',
    good: 'bg-emerald-900/40 text-emerald-200 border-emerald-700',
    bad: 'bg-red-900/40 text-red-200 border-red-700',
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
