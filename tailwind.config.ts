import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/popup/**/*.{ts,tsx}', './popup/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        body: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      colors: {
        ink: '#14131b',
        paper: '#f7f1e7',
        fog: '#edf1f3',
        copper: '#c25a3a',
        lagoon: '#1f6f78',
        ruby: '#b6483d',
        iris: '#5b5d9a'
      },
      boxShadow: {
        soft: '0 10px 30px -20px rgba(20, 19, 27, 0.35)',
        bloom: '0 18px 40px -28px rgba(17, 20, 28, 0.55)'
      }
    }
  },
  plugins: []
};

export default config;
