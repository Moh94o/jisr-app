/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // Preflight is OFF on purpose: this app predates Tailwind and styles every
  // element with inline styles / a global <Css/> block. Enabling Tailwind's
  // base reset would restyle the whole existing UI. We only want the utility
  // classes available going forward, not the reset.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Hussain Offices brand tokens — shared with the transfer-quote print sheet.
        gold: '#c9a84c',
        'gold-d': '#a8842f',
        'on-gold': '#6f5824',
        ink: '#2b2f37',
        muted: '#8d8d88',
        hair: '#e7ddc2',
      },
      fontFamily: {
        cairo: ['Cairo', 'Tajawal', 'sans-serif'],
        cormorant: ['Cormorant', 'serif'],
        'great-vibes': ['"Great Vibes"', 'cursive'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
