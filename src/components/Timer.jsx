import { useEffect, useState } from 'react';
import { formatCountdown } from '../lib/format.js';
import StatusBanner from './StatusBanner.jsx';

const WARN_MS = 60 * 1000;
const URGENT_MS = 15 * 1000;

// Phase timers are a guide, not a hard stop: at zero this shows "Time's up" and play carries on
// until the admin moves to the next phase.
export default function Timer({ endsAt, className = '' }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = endsAt ? endsAt - now : null;
  const timeUp = remaining !== null && remaining <= 0;

  return (
    <span
      role="timer"
      className={`inline-block font-mono tabular-nums transition-colors duration-300 ${timerTone(remaining)} ${className}`}
    >
      {timeUp ? "Time's up" : formatCountdown(endsAt, now)}
    </span>
  );
}

function timerTone(remaining) {
  if (remaining === null || remaining > WARN_MS) return 'text-brand-blue';
  if (remaining > URGENT_MS) return 'text-brand-warn';
  if (remaining > 0) return 'text-brand-error motion-safe:animate-urgent-pulse';
  return 'text-brand-error';
}

// Shown under a phase heading once its timer runs out, so players know the round hasn't frozen.
export function TimeUpNotice({ endsAt, children }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!endsAt || now < endsAt) return null;
  return (
    <div className="mb-4">
      <StatusBanner tone="warn" waiting>
        {children}
      </StatusBanner>
    </div>
  );
}
