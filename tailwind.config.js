/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        soil: '#3d2c1f',
        leaf: '#4a7c59',
        'leaf-light': '#7cb587',
        wheat: '#e8d5a3',
        sky: '#87CEEB',
        accent: '#e07a3a',
        danger: '#c0392b',
        surface: '#faf7f2',
        ink: '#2c1810',
        muted: '#6b5c4f',
      },
    },
  },
  plugins: [],
}
