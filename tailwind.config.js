/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}', './src/index.html'],
  theme: {
    extend: {
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
          '50%': { boxShadow: '0 0 24px 2px rgba(16, 185, 129, 0.45)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 250ms ease-out both',
        shake: 'shake 400ms ease-in-out',
        pop: 'pop 350ms ease-out',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
        'glow-good': 'glow-good 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
