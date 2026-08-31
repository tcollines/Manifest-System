/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ministry: {
          black: '#F3F4F6',
          dark: '#FFFFFF',
          card: '#FFFFFF',
          neon: '#ccff00',
          orange: '#FF5722',
          text: '#111827',
          muted: '#6B7280'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
