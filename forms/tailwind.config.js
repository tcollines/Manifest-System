/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./forms/**/*.{js,ts,jsx,tsx}",
    "./modules/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./shared/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ministry: {
          black: '#F3F4F6', // Main Background (Light Gray)
          dark: '#FFFFFF',  // Component Background (White)
          card: '#FFFFFF',  // Card Background (White)
          neon: '#ccff00',  // Neon Green/Lime (Keep for accents)
          orange: '#FF5722',// Deep Orange
          text: '#111827',  // Main Text (Gray 900)
          muted: '#6B7280'  // Muted Text (Gray 500)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
