// Outline shield glyph used for Defend-side branding.
export default function ShieldIcon({ className = 'h-6 w-6' }) {
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
      <path d="M12 2.5 5 5.2v6.1c0 5.1 3.2 9.3 7 10.7 3.8-1.4 7-5.6 7-10.7V5.2L12 2.5Z" />
      <path d="M12 6.4v10.8" opacity="0.5" />
      <path d="m9 10.5 3-1.6 3 1.6" opacity="0.5" />
    </svg>
  );
}
