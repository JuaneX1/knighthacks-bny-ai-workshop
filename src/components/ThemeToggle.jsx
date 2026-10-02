import { useEffect, useState } from 'react';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ctf_theme', theme);
}

// Floating toggle rendered once in App, so it's present on every route.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed right-4 top-4 z-[10000] flex h-10 w-10 items-center justify-center rounded-full border border-brand-blue/30 bg-panel/90 text-ink shadow-[0_0_14px_rgb(var(--color-blue)/0.3)] transition hover:border-brand-blue/60 hover:shadow-[0_0_18px_rgb(var(--color-blue)/0.5)] active:scale-95"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm9-6a1 1 0 0 1 0 2h-1a1 1 0 1 1 0-2h1ZM4 12a1 1 0 0 1 0 2H3a1 1 0 1 1 0-2h1Zm14.95-6.36a1 1 0 0 1 1.41 1.41l-.7.71a1 1 0 1 1-1.42-1.41l.71-.71ZM6.34 17.66a1 1 0 0 1 1.41 1.41l-.7.71a1 1 0 0 1-1.42-1.41l.71-.71ZM19.07 17.66l.71.71a1 1 0 0 1-1.42 1.41l-.7-.71a1 1 0 0 1 1.41-1.41ZM6.34 6.34l.71.71a1 1 0 1 1-1.42 1.41l-.7-.71a1 1 0 0 1 1.41-1.41ZM12 20a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M20.742 13.045a8.088 8.088 0 0 1-2.077.273c-4.508 0-8.164-3.656-8.164-8.164 0-1.364.334-2.65.925-3.78a1 1 0 0 0-1.21-1.412C5.355 1.467 2 5.936 2 11.2 2 17.164 6.836 22 12.8 22c4.606 0 8.543-2.892 10.09-6.958a1 1 0 0 0-1.33-1.265 8.14 8.14 0 0 1-.818.268Z" />
        </svg>
      )}
    </button>
  );
}
