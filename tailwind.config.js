/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg':     '#09090b',
        'app-card':   '#0f0f12',
        'app-hover':  '#16161a',
        'app-border': '#1c1c22',
        'app-fg':     '#fafafa',
        'app-muted':  '#71717a',
        'app-green':  '#22c55e',
        'app-red':    '#ef4444',
        'app-blue':   '#3b82f6',
        'app-amber':  '#f59e0b',
        'app-input':  '#18181b',
        'app-purple': '#a855f7',
        'app-orange': '#f97316',
        'app-teal':   '#14b8a6',
        'app-pink':   '#ec4899',
        'app-cyan':   '#06b6d4',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
