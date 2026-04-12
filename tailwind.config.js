/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './context/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#181818',
        surface: '#222222',
        border:  '#383838',
        muted:   '#2a2a2a',
        primary: '#6366f1',
        cyan:    '#06b6d4',
        amber:   '#f59e0b',
        green:   '#22c55e',
        red:     '#ef4444',
        't1':    '#e8e6e0',
        't2':    '#9a9590',
        't3':    '#5e5a56',
        't4':    '#818cf8',
      },
      maxWidth: { app: '430px' },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
      },
    },
  },
  plugins: [],
};
