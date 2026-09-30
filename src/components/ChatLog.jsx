import { useEffect, useRef } from 'react';
import AnimatedDots from './AnimatedDots.jsx';

export default function ChatLog({ log, sending, emptyText, className = 'max-h-72' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [log.length, sending]);

  return (
    <div ref={containerRef} className={`mb-3 space-y-2 overflow-y-auto text-sm ${className}`}>
      {log.length === 0 && !sending && emptyText && <p className="text-slate-500">{emptyText}</p>}
      {log.map((m, i) => (
        <p
          key={i}
          className={`motion-safe:animate-fade-in-up ${m.role === 'user' ? 'text-slate-300' : 'text-indigo-300'}`}
        >
          <span className="font-medium">{m.role === 'user' ? 'You: ' : 'Bot: '}</span>
          {m.text}
        </p>
      ))}
      {sending && (
        <p className="flex items-center gap-2 text-indigo-300 motion-safe:animate-fade-in-up" role="status">
          <span className="font-medium">Bot:</span>
          <AnimatedDots />
          <span className="sr-only">Bot is typing</span>
        </p>
      )}
    </div>
  );
}
