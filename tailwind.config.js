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
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '40%': { opacity: '1', transform: 'translateY(-3px)' },
        },
        'glow-good': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--color-success) / 0)' },
          '50%': { boxShadow: '0 0 24px 2px rgb(var(--color-success) / 0.45)' },
        },
        'flicker-in': {
          '0%': { opacity: '0' },
          '10%': { opacity: '0.4' },
          '12%': { opacity: '0' },
          '20%': { opacity: '0.8' },
          '24%': { opacity: '0.2' },
          '30%': { opacity: '1' },
          '100%': { opacity: '1' },
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
          '0%': { opacity: '0', transform: 'scale(1.25)', letterSpacing: '0.4em' },
          '60%': { opacity: '1', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'urgent-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(1.06)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 250ms ease-out both',
        shake: 'shake 400ms ease-in-out',
        pop: 'pop 350ms ease-out',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
        'glow-good': 'glow-good 2s ease-in-out infinite',
        'flicker-in': 'flicker-in 900ms ease-out both',
        'glow-pulse-blue': 'glow-pulse-blue 2.4s ease-in-out infinite',
        'reveal-sweep': 'reveal-sweep 650ms cubic-bezier(0.65, 0, 0.35, 1) both',
        'slam-in': 'slam-in 450ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-out': 'fade-out 300ms ease-in both',
        'urgent-pulse': 'urgent-pulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
