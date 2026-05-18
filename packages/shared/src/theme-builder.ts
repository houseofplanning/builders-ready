/**
 * Builds a tenant-branded theme from a primary + accent hex.
 *
 * The mobile app calls this once per session (after loading the tenant row)
 * and passes the result down via a ThemeProvider. The web admin console
 * applies the values as CSS variables on the <html> element.
 */

import { palette as base, type PaletteKey } from './theme';

export interface TenantBrand {
  primary: string;   // hex — required
  accent: string;    // hex — required
}

export type TenantPalette = Record<PaletteKey, string>;

/**
 * Compose a per-tenant palette. Currently overrides only `primary` /
 * `primaryDeep` / `primarySoft` / `accent` / `accentDeep` / `accentSoft`.
 * Everything else stays platform-default.
 */
export function buildTenantPalette(brand: TenantBrand): TenantPalette {
  return {
    ...base,
    primary: brand.primary,
    primaryDeep: shade(brand.primary, -0.15),
    primarySoft: withAlpha(brand.primary, 0.08),
    accent: brand.accent,
    accentDeep: shade(brand.accent, -0.15),
    accentSoft: withAlpha(brand.accent, 0.12),
  };
}

/**
 * CSS-variable map for the web app. Apply via:
 *   document.documentElement.style.setProperty(...)
 * or inline on a Server Component wrapping a tenant route.
 */
export function paletteToCssVars(p: TenantPalette): Record<string, string> {
  return {
    '--br-ink': p.ink,
    '--br-ink-soft': p.inkSoft,
    '--br-ink-muted': p.inkMuted,
    '--br-primary': p.primary,
    '--br-primary-deep': p.primaryDeep,
    '--br-primary-soft': p.primarySoft,
    '--br-accent': p.accent,
    '--br-accent-deep': p.accentDeep,
    '--br-accent-soft': p.accentSoft,
    '--br-canvas': p.canvas,
    '--br-card': p.card,
    '--br-hairline': p.hairline,
    '--br-success': p.success,
    '--br-warning': p.warning,
    '--br-error': p.error,
    '--br-info': p.info,
  };
}

// ---------- helpers ----------

function shade(hex: string, amount: number): string {
  // amount in [-1, 1]: -0.2 = 20% darker, +0.2 = 20% lighter
  const { r, g, b } = hexToRgb(hex);
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + 255 * amount)));
  return rgbToHex(adjust(r), adjust(g), adjust(b));
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const expanded =
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(expanded, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}
