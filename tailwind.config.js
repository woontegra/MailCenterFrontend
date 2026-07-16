/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: {
          DEFAULT: '#f3f5f7',
          soft: '#eef1f4',
          line: '#d8dee6',
        },
        dock: {
          DEFAULT: '#1a2332',
          raised: '#243044',
          muted: '#8b97a8',
          edge: '#2c3a4f',
        },
        signal: {
          DEFAULT: '#0f9aa8',
          soft: '#d7f2f5',
          deep: '#0b6f7a',
          glow: '#1bb8c7',
        },
        ink: {
          DEFAULT: '#15202b',
          soft: '#4a5565',
          faint: '#7a8696',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      scale: {
        '98': '0.98',
      },
      boxShadow: {
        panel: '0 12px 40px -24px rgba(21, 32, 43, 0.35)',
        dock: '8px 0 32px -16px rgba(15, 23, 42, 0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        'flow-dot': {
          '0%': { transform: 'translateX(0)', opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        'pulse-soft': 'pulse-soft 2.8s ease-in-out infinite',
        'flow-dot': 'flow-dot 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
