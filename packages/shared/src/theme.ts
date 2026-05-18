/**
 * Builders Ready — base design tokens.
 *
 * Brand colours are tenant-resolved at runtime via theme-builder.ts.
 * The values below are the platform defaults (used on marketing, onboarding,
 * and any tenant-agnostic surface). Tenant-branded surfaces override
 * `primary` and `accent` via the TenantProvider.
 */

export const palette = {
  // Ink — platform neutrals
  ink: '#0B1418',
  inkSoft: '#1A2C34',
  inkMuted: '#5F7480',

  // Default brand — overridden per tenant at runtime
  primary: '#0F4C5C',         // deep teal — platform default
  primaryDeep: '#0A3641',
  primarySoft: 'rgba(15, 76, 92, 0.08)',
  accent: '#E07A5F',          // warm copper — platform default
  accentDeep: '#C25A40',
  accentSoft: 'rgba(224, 122, 95, 0.12)',

  // Surface
  canvas: '#F4F6F7',
  card: '#FFFFFF',
  hairline: '#E1E6E9',

  // Status
  success: '#2E7D32',
  successSoft: 'rgba(46, 125, 50, 0.08)',
  warning: '#B26A00',
  warningSoft: 'rgba(178, 106, 0, 0.08)',
  error: '#B0322B',
  errorSoft: 'rgba(176, 50, 43, 0.08)',
  info: '#1F4E79',
  infoSoft: 'rgba(31, 78, 121, 0.08)',

  // Misc
  overlay: 'rgba(11, 20, 24, 0.55)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type PaletteKey = keyof typeof palette;

export const radius = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  fontFamilySystem:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  weightExtraBold: '800',
  size: {
    xs: 11,
    sm: 12,
    body: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  trackingWide: 3,
  trackingTight: -0.2,
} as const;

export const shadow = {
  card: '0 4px 14px rgba(11, 20, 24, 0.06)',
  raised: '0 14px 40px rgba(11, 20, 24, 0.14)',
} as const;

/**
 * Tailwind-shaped colour map for apps/web. Tenant brand colours are NOT
 * surfaced here — they're applied via CSS variables at runtime so the
 * Tailwind build can stay static.
 */
export const tailwindColors = {
  ink: palette.ink,
  'ink-soft': palette.inkSoft,
  'ink-muted': palette.inkMuted,
  primary: palette.primary,
  'primary-deep': palette.primaryDeep,
  accent: palette.accent,
  'accent-deep': palette.accentDeep,
  canvas: palette.canvas,
  card: palette.card,
  hairline: palette.hairline,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
} as const;

/**
 * Stage status visual mapping. Used by both timeline rendering and the
 * admin stage editor.
 */
export const stageStatusStyle = {
  not_started: { label: 'Not started', fg: palette.inkMuted, bg: '#EDF0F2' },
  in_progress: { label: 'In progress', fg: palette.info, bg: palette.infoSoft },
  complete: { label: 'Complete', fg: palette.success, bg: palette.successSoft },
  delayed: { label: 'Delayed', fg: palette.error, bg: palette.errorSoft },
} as const;

export type StageStatus = keyof typeof stageStatusStyle;
