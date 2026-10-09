// Outline glyph for each fixed team slot, drawn in the same style as ShieldIcon and SwordIcon.
// Keyed by team id, so an admin renaming a team keeps its icon.
const GLYPHS = {
  // Lightning bolt.
  'team-spark': <path d="M13.2 2.5 5.5 13.2h5.8l-1 8.3 7.7-10.7h-5.8l1-8.3Z" />,
  // Sprout: two leaves on a stem.
  'team-thrive': (
    <>
      <path d="M12 21v-8.5" />
      <path d="M12 13.5c0-4-2.6-6.7-7-6.7 0 4.2 2.7 6.7 7 6.7Z" />
      <path d="M12 11c0-3.6 2.4-6.3 7-6.3 0 3.9-2.6 6.3-7 6.3Z" />
      <path d="M8.5 21h7" opacity="0.5" />
    </>
  ),
  // Planted flag.
  'team-own-it': (
    <>
      <path d="M6 21.5V3" />
      <path d="M6 4h11.5l-2.6 4 2.6 4H6" />
      <path d="M3.5 21.5h5" opacity="0.5" />
    </>
  ),
  // Magnifying glass.
  'team-curious': (
    <>
      <circle cx="10.5" cy="10.5" r="6.2" />
      <path d="m15 15 5.5 5.5" />
      <path d="M7.8 8.6a3.3 3.3 0 0 1 2.6-1.5" opacity="0.5" />
    </>
  ),
};

export default function TeamIcon({ teamId, className = 'h-5 w-5' }) {
  const glyph = GLYPHS[teamId];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}
