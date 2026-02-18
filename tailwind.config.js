/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce6ff',
          200: '#b8ccff',
          300: '#85a6ff',
          400: '#5577ff',
          500: '#3355ff',
          600: '#1a35f5',
          700: '#1428e0',
          800: '#1723b5',
          900: '#19248f',
          950: '#111660',
        },
        surface: {
          900: '#0f0f14',
          800: '#16161e',
          700: '#1e1e2a',
          600: '#252536',
          500: '#2e2e42',
          400: '#3d3d55',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
