/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        panel: '#111214',
        panel2: '#17181b',
        line: '#242528',
        ink: '#e5e7eb',
        muted: '#8b8f98',
        accent: '#7cfcb9',
        warn: '#ffb86b',
        bad: '#ff6b7a',
      },
    },
  },
  plugins: [],
};
