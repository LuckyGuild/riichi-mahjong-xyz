/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        jpn4: ['nuwakkaoim4'],
        res: [
          'Source Code Pro',
          'system-ui',
          '-apple-system'
        ],
      },
      cursor: {
        nes: "url('/src/assets/cursor.png'), pointer",
      },
      keyframes: {
        blinkYellow: {
          '0%, 100%': { backgroundColor: '#FF4136' }, // Original button color (e.g., NES.css is-error)
          '50%': { backgroundColor: '#FFEA00' }, // Yellow color
        },
      },
      animation: {
        'blink-yellow': 'blinkYellow 1s infinite',
      },
    },
  },
  plugins: [],
}
