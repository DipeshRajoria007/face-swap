import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/popup/**/*.{ts,tsx}', './popup/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#0e1116',
        clay: '#f5f2ec',
        ember: '#f05d23',
        pine: '#0f766e'
      },
      boxShadow: {
        soft: '0 10px 30px -20px rgba(14, 17, 22, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
