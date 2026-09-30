export default function RoundHistorySkeleton({ rows = 2 }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading round history">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-lg border border-slate-700 bg-slate-900 p-4 motion-safe:animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 rounded bg-slate-700" />
            <div className="h-5 w-16 rounded bg-slate-700" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="h-20 rounded bg-slate-800" />
            <div className="h-20 rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
