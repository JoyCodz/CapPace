/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D0D0F',
        surface: '#1A1A1F',
        primary: '#FF0000', // YouTube Red
        secondary: '#6366F1', // Indigo
      }
    },
  },
  plugins: [],
}
