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
        bg:      '#08090f',
        surface: '#111421',
        border:  '#1c2035',
        muted:   '#0d0f1a',
        primary: '#6366f1',
        cyan:    '#06b6d4',
        amber:   '#f59e0b',
        green:   '#22c55e',
        red:     '#ef4444',
        't1':    '#eef0ff',
        't2':    '#7a85a0',
        't3':    '#424960',
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
