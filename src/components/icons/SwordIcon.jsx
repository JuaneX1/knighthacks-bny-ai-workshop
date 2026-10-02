// Outline sword glyph used for Attack-side branding.
export default function SwordIcon({ className = 'h-6 w-6' }) {
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
      <path d="M12 2.2 13.6 3.8v10.1L12 15.5l-1.6-1.6V3.8Z" />
      <path d="M7.2 12.9h9.6" />
      <path d="M12 15.5v5.3" />
      <circle cx="12" cy="21.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
