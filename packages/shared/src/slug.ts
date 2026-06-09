/**
 * Tenant slug normalisation + validation. Mirrors the DB CHECK + the
 * Zod schema in schemas.ts.
 *
 * Allowed: lowercase letters, digits, hyphens. 2-40 chars. Cannot start
 * or end with a hyphen.
 */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// Reserved slugs that conflict with platform routes.
const RESERVED = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'billing',
  'dashboard',
  'docs',
  'forgot-password',
  'help',
  'login',
  'onboarding',
  'reset-password',
  'pricing',
  'privacy',
  'public',
  'settings',
  'signup',
  'static',
  'support',
  'terms',
  'webhooks',
  'www',
]);

export function normaliseSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidSlug(slug: string): boolean {
  if (!SLUG_RE.test(slug)) return false;
  if (RESERVED.has(slug)) return false;
  return true;
}

export function explainSlugError(slug: string): string | null {
  if (slug.length < 2) return 'must be at least 2 characters';
  if (slug.length > 40) return 'must be at most 40 characters';
  if (slug.startsWith('-') || slug.endsWith('-'))
    return 'cannot start or end with a hyphen';
  if (!/^[a-z0-9-]+$/.test(slug))
    return 'use lowercase letters, digits and hyphens only';
  if (RESERVED.has(slug)) return 'this slug is reserved';
  return null;
}
