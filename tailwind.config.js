/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#06060e',
        surface: '#0b0d1c',
        card: '#0e1020',
        'card-hover': '#12152a',
        accent: {
          purple: '#8b5cf6',
          'purple-light': '#a78bfa',
          'purple-dark': '#7c3aed',
          cyan: '#22d3ee',
          orange: '#f97316',
          green: '#10b981',
          red: '#ef4444',
        },
        muted: '#4b5680',
        'muted-light': '#6b728a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out both',
        'fade-in': 'fadeIn 0.25s ease-out both',
        'dot-ping': 'dotPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        glowPulse: {
          from: { boxShadow: '0 0 10px rgba(139,92,246,0.3), 0 0 20px rgba(139,92,246,0.08)' },
          to: { boxShadow: '0 0 22px rgba(139,92,246,0.65), 0 0 50px rgba(139,92,246,0.18)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        dotPing: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      boxShadow: {
        'glow-purple': '0 0 22px rgba(139,92,246,0.55), 0 0 50px rgba(139,92,246,0.15)',
        'glow-purple-sm': '0 0 12px rgba(139,92,246,0.4)',
        'glow-cyan': '0 0 18px rgba(34,211,238,0.45)',
        'glow-green': '0 0 8px rgba(16,185,129,0.6)',
        card: '0 2px 24px rgba(0,0,0,0.55)',
        'card-hover':
          '0 6px 36px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.22)',
      },
    },
  },
  plugins: [],
};
