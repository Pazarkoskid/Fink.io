/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic colors that respond to theme (defined in index.css via CSS vars)
        bg:      'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        border:  'rgb(var(--border) / <alpha-value>)',
        fg:      'rgb(var(--fg) / <alpha-value>)',
        muted:   'rgb(var(--muted) / <alpha-value>)',
        subtle:  'rgb(var(--subtle) / <alpha-value>)',

        // Brand colors - unchanged across themes
        accent: {
          DEFAULT: '#ff5b1f',
          soft:    '#ffb999',
          dark:    '#c43d0a',
          glow:    'rgba(255, 91, 31, 0.4)',
        },

        // Legacy palette (kept for places that still reference 'cream', 'ink-*')
        ink: {
          50:  '#f6f5f0',
          100: '#ecebe2',
          200: '#d8d6c4',
          300: '#bab69e',
          400: '#9a9476',
          500: '#7e7858',
          600: '#615c43',
          700: '#454232',
          800: '#2a2820',
          900: '#181712',
          950: '#0c0b08',
        },
        cream: '#fbf8ec',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft':    '0 4px 24px -8px rgb(var(--shadow) / 0.15)',
        'medium':  '0 8px 32px -8px rgb(var(--shadow) / 0.22)',
        'hard':    '4px 4px 0 0 rgb(var(--fg))',
        'glow':    '0 0 32px rgba(255, 91, 31, 0.25)',
        'glow-lg': '0 0 64px rgba(255, 91, 31, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-up':  'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'gradient':   'gradient 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        gradient: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
