import 'server-only';
import Stripe from 'stripe';
import type { SubscriptionTier } from '@br/shared';

/**
 * Server-only Stripe SDK singleton + small helpers.
 *
 * Required env:
 *   STRIPE_SECRET_KEY                — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET            — whsec_... (set per env via Stripe CLI / dashboard)
 *   STRIPE_PRICE_STARTER_MONTHLY     — price_...
 *   STRIPE_PRICE_STARTER_ANNUAL
 *   STRIPE_PRICE_PRO_MONTHLY
 *   STRIPE_PRICE_PRO_ANNUAL
 *   STRIPE_PRICE_UNLIMITED_MONTHLY
 *   STRIPE_PRICE_UNLIMITED_ANNUAL
 */

let singleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (singleton) return singleton;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  singleton = new Stripe(key, {
    // @ts-expect-error pin to a known-stable API version
    apiVersion: '2024-11-20.acacia',
  });
  return singleton;
}

export type Cadence = 'monthly' | 'annual';

export function priceIdFor(
  tier: SubscriptionTier,
  cadence: Cadence,
): string | null {
  const map: Record<SubscriptionTier, Record<Cadence, string | undefined>> = {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    },
    unlimited: {
      monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
      annual: process.env.STRIPE_PRICE_UNLIMITED_ANNUAL,
    },
  };
  return map[tier][cadence] ?? null;
}

/**
 * Inverse mapping — given a Stripe price ID, return the BR tier. Used by
 * the webhook handler to keep tenants.subscription_tier in sync with the
 * actual subscription items.
 */
export function tierForPriceId(priceId: string): SubscriptionTier | null {
  if (
    priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_STARTER_ANNUAL
  )
    return 'starter';
  if (
    priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PRO_ANNUAL
  )
    return 'pro';
  if (
    priceId === process.env.STRIPE_PRICE_UNLIMITED_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_UNLIMITED_ANNUAL
  )
    return 'unlimited';
  return null;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://buildersready.uk';
}
