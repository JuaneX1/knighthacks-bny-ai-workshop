/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}', './src/index.html'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        void: 'rgb(var(--color-void) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        well: 'rgb(var(--color-well) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'btn-ink': 'rgb(var(--color-btn-ink) / <alpha-value>)',
        // The color of the nearest `.team-*` element; see index.css.
        team: 'rgb(var(--team) / <alpha-value>)',
        brand: {
          blue: 'rgb(var(--color-blue) / <alpha-value>)',
          success: 'rgb(var(--color-success) / <alpha-value>)',
          error: 'rgb(var(--color-error) / <alpha-value>)',
          warn: 'rgb(var(--color-warn) / <alpha-value>)',
        },
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0) rotate(0)' },
          '15%, 55%': { transform: 'translateX(-10px) rotate(-1deg)' },
          '35%, 75%': { transform: 'translateX(10px) rotate(1deg)' },
          '90%': { transform: 'translateX(-3px)' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '40%': { opacity: '1', transform: 'translateY(-3px)' },
        },
        'glow-good': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--color-success) / 0)' },
          '50%': { boxShadow: '0 0 28px 4px rgb(var(--color-success) / 0.5)' },
        },
        // Title arrives in sliced, offset strips that snap together, like a bad signal locking in.
        'glitch-in': {
          '0%': { opacity: '0', clipPath: 'inset(40% 0 45% 0)', transform: 'translateX(-14px) skewX(-12deg)' },
          '20%': { opacity: '1', clipPath: 'inset(0 0 70% 0)', transform: 'translateX(10px) skewX(8deg)' },
          '40%': { clipPath: 'inset(60% 0 0 0)', transform: 'translateX(-6px) skewX(-4deg)' },
          '60%': { clipPath: 'inset(20% 0 30% 0)', transform: 'translateX(4px)' },
          '80%': { clipPath: 'inset(0 0 0 0)', transform: 'translateX(-2px)' },
          '100%': { opacity: '1', clipPath: 'inset(0 0 0 0)', transform: 'none' },
        },
        'glow-pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--color-blue) / 0)' },
          '50%': { boxShadow: '0 0 20px 1px rgb(var(--color-blue) / 0.35)' },
        },
        scan: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
        // A circle of color growing out from the middle of the screen until it covers it.
        'reveal-sweep': {
          '0%': { clipPath: 'circle(0% at 50% 50%)' },
          '100%': { clipPath: 'circle(150% at 50% 50%)' },
        },
        'slam-in': {
          '0%': { opacity: '0', transform: 'scale(1.8)', filter: 'blur(8px)' },
          '55%': { opacity: '1', transform: 'scale(0.92)', filter: 'blur(0)' },
          '75%': { transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Rubber stamp hitting the page: oversized and crooked, then pressed down at a slight tilt.
        stamp: {
          '0%': { opacity: '0', transform: 'scale(2.4) rotate(-14deg)' },
          '60%': { opacity: '1', transform: 'scale(0.94) rotate(-5deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-4deg)' },
        },
        // One countdown second: the number punches out and settles.
        tick: {
          '0%': { transform: 'scale(1.5)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        shake: 'shake 500ms cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
        'glow-good': 'glow-good 2s ease-in-out infinite',
        'glitch-in': 'glitch-in 600ms steps(1, end) both',
        'glow-pulse-blue': 'glow-pulse-blue 2.4s ease-in-out infinite',
        'reveal-sweep': 'reveal-sweep 650ms cubic-bezier(0.65, 0, 0.35, 1) both',
        'slam-in': 'slam-in 550ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        stamp: 'stamp 450ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        tick: 'tick 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-out': 'fade-out 300ms ease-in both',
      },
    },
  },
  plugins: [],
};
