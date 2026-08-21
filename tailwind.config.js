/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rose Ember
        primary: '#FED7AA', // peach — body text
        ember: '#BE123C',   // crimson — accent
        ink: '#1A0C14',     // deep plum — page ground
        surface: '#241019',
        surface2: '#2E1622'
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'serif']
      }
    }
  },
  plugins: []
};
