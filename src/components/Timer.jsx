import { useEffect, useState } from 'react';
import { formatCountdown } from '../lib/format.js';

export default function Timer({ endsAt, className = '' }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const overdue = endsAt && now >= endsAt;

  return (
    <span className={`font-mono tabular-nums ${overdue ? 'text-red-400' : ''} ${className}`}>
      {overdue ? 'Overdue' : formatCountdown(endsAt, now)}
    </span>
  );
}
