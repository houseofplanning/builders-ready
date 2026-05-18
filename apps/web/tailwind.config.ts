import type { Config } from 'tailwindcss';
import { tailwindColors } from '../../packages/shared/src/theme';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ...tailwindColors,
        // CSS-variable-backed tenant colours; resolved at runtime per tenant
        'tenant-primary': 'var(--br-primary)',
        'tenant-primary-deep': 'var(--br-primary-deep)',
        'tenant-primary-soft': 'var(--br-primary-soft)',
        'tenant-accent': 'var(--br-accent)',
        'tenant-accent-deep': 'var(--br-accent-deep)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 4px 14px rgba(11, 20, 24, 0.06)',
        raised: '0 14px 40px rgba(11, 20, 24, 0.14)',
      },
    },
  },
  plugins: [],
};

export default config;
