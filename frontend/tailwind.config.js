/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Augmented to catch Vite-React code sheets
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#1A365D',
          900: '#0A1D37',
        }
      }
    },
  },
  plugins: [],
}