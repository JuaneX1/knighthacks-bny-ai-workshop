// Three staggered bouncing dots, used for "bot is typing" and trailing "waiting" text.
export default function AnimatedDots({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-60 motion-safe:animate-typing-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
