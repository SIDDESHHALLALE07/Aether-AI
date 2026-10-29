/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#F5F7FB',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
          hover: '#F8FAFC',
          sidebar: 'rgba(255,255,255,0.76)',
          canvas: '#F5F7FB',
        },
        surface: {
          base: '#FFFFFF',
          elevated: 'rgba(255,255,255,0.92)',
          glass: 'rgba(255,255,255,0.72)',
        },
        text: {
          primary: '#111827',
          secondary: '#475569',
          muted: '#64748B',
        },
        accent: {
          indigo: '#4F46E5',
          indigoLight: '#6366F1',
          cyan: '#0284C7',
          emerald: '#059669',
          amber: '#D97706',
          rose: '#DC2626',
        },
        border: {
          subtle: '#E2E8F0',
          card: 'rgba(255,255,255,0.80)',
          glow: 'rgba(79,70,229,0.16)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
