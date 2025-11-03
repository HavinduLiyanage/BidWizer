import type { Config } from 'tailwindcss'

const toRgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1200px', '2xl': '1320px' }
    },
    extend: {
      colors: {
        navy: { 900: toRgb('--bw-navy-900'), 800: toRgb('--bw-navy-800') },
        primary: { DEFAULT: toRgb('--bw-primary-500'), 600: toRgb('--bw-primary-600') },
        ink: toRgb('--bw-ink'),
        muted: toRgb('--bw-muted'),
        card: toRgb('--bw-card'),
        border: toRgb('--bw-border'),
        ring: toRgb('--bw-primary-500')
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      },
      boxShadow: {
        tile: 'var(--shadow-tile)',
        soft: 'var(--shadow-soft)'
      },
      letterSpacing: { tightest: '-0.025em' }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
}
export default config
