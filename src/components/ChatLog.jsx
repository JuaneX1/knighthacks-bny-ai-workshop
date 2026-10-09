import { useEffect, useRef, useState } from 'react';
import AnimatedDots from './AnimatedDots.jsx';

const COLLAPSE_AT_CHARS = 600;

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
      {log.length === 0 && !sending && emptyText && <p className="text-brand-blue/40">{emptyText}</p>}
      {log.map((m, i) => (
        <ChatMessage key={i} message={m} />
      ))}
      {sending && (
        <p className="flex items-center gap-2 text-brand-blue/80 motion-safe:animate-fade-in-up" role="status">
          <span className="font-medium">Bot:</span>
          <AnimatedDots />
          <span className="sr-only">Bot is typing</span>
        </p>
      )}
    </div>
  );
}

// Long pasted messages (prompt stuffing) start collapsed so they don't bury the conversation.
function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const long = message.text.length > COLLAPSE_AT_CHARS;
  const [expanded, setExpanded] = useState(false);
  const text = long && !expanded ? `${message.text.slice(0, COLLAPSE_AT_CHARS)}…` : message.text;

  return (
    <div className={`motion-safe:animate-fade-in-up ${isUser ? 'text-ink/80' : 'text-brand-blue/90'}`}>
      <p className="whitespace-pre-wrap break-words">
        <span className="font-medium">{isUser ? 'You: ' : 'Bot: '}</span>
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="text-xs text-brand-blue/40 underline hover:text-brand-blue/80"
        >
          {expanded ? 'Show less' : `Show all (${message.text.length.toLocaleString()} characters)`}
        </button>
      )}
    </div>
  );
}
