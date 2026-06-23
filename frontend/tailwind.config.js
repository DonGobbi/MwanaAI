/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        // Rexplore Research Labs brand — warm terracotta accent.
        primary: {
          50: '#fdf4ef',
          100: '#fae6da',
          200: '#f4c9b2',
          300: '#eca37f',
          400: '#e07a4d',
          500: '#d15a2b',
          600: '#c2410c',
          700: '#9a3412',
          800: '#7c2d14',
          900: '#652016',
        },
        // Navy, from the brand wordmark.
        secondary: {
          50: '#f4f6fb',
          100: '#e8edf5',
          200: '#cbd6e6',
          300: '#9fb1cd',
          400: '#6b82ad',
          500: '#48618f',
          600: '#344b73',
          700: '#2a3c5d',
          800: '#24314b',
          900: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
