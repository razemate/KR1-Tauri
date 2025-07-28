/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FFA500',
        'bg-dark': '#0B1437',
        'bg-light': '#ffffff'
      }
    }
  },
  plugins: []
}
