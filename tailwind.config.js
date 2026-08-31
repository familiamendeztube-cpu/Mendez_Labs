/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#030403',
          panel: '#080A09',
          elevated: '#0C0F0D',
        },
        ivory: '#F1F0EC',
        silver: {
          DEFAULT: '#B8BBB8',
        },
        muted: '#737A76',
        emerald: {
          DEFAULT: '#168A52',
          bright: '#36D67E',
        },
        amber: {
          warn: '#E0A532',
        },
        risk: {
          DEFAULT: '#D94550',
        },
        line: {
          DEFAULT: 'rgba(220,225,222,0.16)',
          active: 'rgba(54,214,126,0.42)',
          green: 'rgba(54,214,126,0.18)',
        },
        // Backward-compatible aliases for secondary pages
        intel: {
          DEFAULT: '#36D67E',
          dark: '#168A52',
          muted: 'rgba(54,214,126,0.12)',
        },
        cyan: {
          data: '#168A52',
          muted: 'rgba(22,138,82,0.12)',
        },
        content: {
          primary: '#F1F0EC',
          secondary: '#737A76',
        },
      },
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.8)',
        'panel-elevated': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.85)',
        glow: '0 0 0 1px rgba(54,214,126,0.25), 0 0 24px -6px rgba(54,214,126,0.15)',
        'glow-risk': '0 0 0 1px rgba(217,69,80,0.3), 0 0 24px -6px rgba(217,69,80,0.2)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-soft': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        heartbeat: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '20%': { transform: 'scaleY(1)' },
          '40%': { transform: 'scaleY(0.5)' },
          '60%': { transform: 'scaleY(0.8)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        scan: 'scan 4s linear infinite',
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        heartbeat: 'heartbeat 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
