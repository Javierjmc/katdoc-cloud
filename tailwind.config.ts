import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff7f3',
          100: '#ffe8dc',
          200: '#ffc9ad',
          300: '#ffa07a',
          400: '#f07848',
          500: '#E8724A',   // Primary — naranja KATDOC
          600: '#cc5a32',
          700: '#a8431f',
          800: '#7a2f12',
          900: '#4a1a07',
        },
        surface: {
          50:  '#f8f8f8',
          100: '#f0f0f0',
          200: '#e0e0e0',
          300: '#c0c0c0',
          400: '#909090',
          500: '#606060',
          600: '#404040',
          700: '#2D2D2D',   // Gris oscuro KATDOC
          800: '#1e1e1e',
          900: '#111111',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      screens: {
        xs: '360px',
      },
    },
  },
  plugins: [],
};

export default config;
