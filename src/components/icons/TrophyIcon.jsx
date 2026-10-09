// Outline trophy glyph for the bracket's champion slot.
export default function TrophyIcon({ className = 'h-6 w-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3.5h10v5.2a5 5 0 0 1-10 0V3.5Z" />
      <path d="M7 5.5H4.6a2.6 2.6 0 0 0 3 3.6" />
      <path d="M17 5.5h2.4a2.6 2.6 0 0 1-3 3.6" />
      <path d="M12 13.7v3.8" />
      <path d="M8.5 20.5h7l-.8-3h-5.4l-.8 3Z" />
    </svg>
  );
}
