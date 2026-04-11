/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1117',
        surface: '#1a1d27',
        surfaceHover: '#22263a',
        border: '#2a2d3e',
        gold: '#e8a849',
        goldDim: '#c48930',
        text: '#e8e8f0',
        textMuted: '#8888aa',
        // Dimension colors
        body: '#e8a849',
        diet: '#7ec8a4',
        mind: '#a49ee8',
        career: '#e87e7e',
        relation: '#e8c87e',
        family: '#7ec4e8',
        finance: '#a8e87e',
        inner: '#e87ec4',
        // Status colors
        statusC: '#6b7280',
        statusL: '#60a5fa',
        statusZ: '#f59e0b',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(232, 168, 73, 0.15)',
        glowStrong: '0 0 40px rgba(232, 168, 73, 0.3)',
        card: '0 2px 16px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
