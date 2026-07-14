
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          gray: '#1A1A1A',
          accent: '#00FF41', // Matrix/Terminal Green for that AI feel
        }
      }
    },
  },
  plugins: [],
}
