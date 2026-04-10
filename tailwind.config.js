/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        game: ['Nunito', 'system-ui', 'sans-serif'],
        hand: ['Patrick Hand', 'cursive'],
      },
      colors: {
        soil: '#3d2c1f',
        'soil-light': '#5a4332',
        leaf: '#4a7c59',
        'leaf-light': '#7cb587',
        'leaf-dark': '#2d5a3a',
        wheat: '#e8d5a3',
        'wheat-light': '#f5ecd4',
        sky: '#5ba4cf',
        'sky-light': '#a8d8f0',
        accent: '#e07a3a',
        'accent-light': '#f4a261',
        danger: '#c0392b',
        surface: '#f0ead6',
        'surface-dark': '#e4dcc4',
        ink: '#2c1810',
        muted: '#6b5c4f',

        // Tab-specific theme colors
        farm: { bg: '#e8dcc8', border: '#8b7355', accent: '#6d8b4e' },
        lab: { bg: '#e8eef5', border: '#7a9bb5', accent: '#4a7c9b' },
        school: { bg: '#2d3b2d', border: '#4a5c3a', accent: '#8fbc6a', text: '#e8e0d0' },
        office: { bg: '#f2ece0', border: '#9b8b73', accent: '#6b7c5a' },
        news: { bg: '#faf5e8', border: '#c4b08a', accent: '#8b6914' },
      },
      boxShadow: {
        'game': '0 2px 8px rgba(61, 44, 31, 0.15)',
        'game-lg': '0 4px 16px rgba(61, 44, 31, 0.2)',
        'glow-accent': '0 0 12px rgba(224, 122, 58, 0.5)',
        'glow-leaf': '0 0 12px rgba(74, 124, 89, 0.5)',
        'inner-soil': 'inset 0 2px 4px rgba(61, 44, 31, 0.1)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(224, 122, 58, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(224, 122, 58, 0.7), 0 0 30px rgba(224, 122, 58, 0.3)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
}
