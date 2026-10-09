import { useCallback, useState } from 'react';

const TONES = {
  good: 'border-brand-success/50 text-brand-success',
  bad: 'border-brand-error/50 text-brand-error',
};

// Short-lived confirmations ("Attack phase started") and errors, stacked in the bottom corner.
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (tone, text) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((all) => [...all.slice(-3), { id, tone, text }]);
      // Errors stay up longer, since they usually need reading.
      setTimeout(() => dismiss(id), tone === 'bad' ? 9000 : 3500);
    },
    [dismiss],
  );

  return { toasts, notify, dismiss };
}

export function Toasts({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[10002] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-lg border bg-panel px-4 py-3 text-sm shadow-lg motion-safe:animate-fade-in-up ${TONES[t.tone]}`}
        >
          <span className="flex-1">{t.text}</span>
          <button type="button" onClick={() => dismiss(t.id)} className="text-ink/50 hover:text-ink" aria-label="Dismiss">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
