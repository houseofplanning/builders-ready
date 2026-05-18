/**
 * Subscription tier definitions. Keep aligned with:
 *   - the subscription_tier enum in supabase/migrations/*
 *   - the enforce_project_limit() trigger in supabase/migrations/*
 *   - the Stripe Prices created in the Stripe dashboard
 */

import type { SubscriptionTier } from './types';

export interface TierConfig {
  id: SubscriptionTier;
  label: string;
  activeProjectLimit: number;       // 100000 == effectively unlimited
  monthlyPence: number;
  annualPence: number;              // total cost / year
  stripeMonthlyPriceEnv: string;    // env var name to lookup
  stripeAnnualPriceEnv: string;
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    activeProjectLimit: 10,
    monthlyPence: 2900,             // £29.00
    annualPence: 27600,             // £276.00 (£23/mo equiv. at 20% off)
    stripeMonthlyPriceEnv: 'STRIPE_PRICE_STARTER_MONTHLY',
    stripeAnnualPriceEnv: 'STRIPE_PRICE_STARTER_ANNUAL',
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    activeProjectLimit: 50,
    monthlyPence: 6900,             // £69.00
    annualPence: 66000,             // £660.00 (£55/mo equiv.)
    stripeMonthlyPriceEnv: 'STRIPE_PRICE_PRO_MONTHLY',
    stripeAnnualPriceEnv: 'STRIPE_PRICE_PRO_ANNUAL',
  },
  unlimited: {
    id: 'unlimited',
    label: 'Unlimited',
    activeProjectLimit: 100_000,
    monthlyPence: 14900,            // £149.00
    annualPence: 142800,            // £1,428.00 (£119/mo equiv.)
    stripeMonthlyPriceEnv: 'STRIPE_PRICE_UNLIMITED_MONTHLY',
    stripeAnnualPriceEnv: 'STRIPE_PRICE_UNLIMITED_ANNUAL',
  },
};

export const TRIAL_DAYS = 14;
export const SUSPEND_GRACE_DAYS = 7;
export const ARCHIVE_AFTER_DAYS = 30;

export function tierForActiveProjectCount(
  count: number,
): SubscriptionTier | null {
  if (count <= TIERS.starter.activeProjectLimit) return 'starter';
  if (count <= TIERS.pro.activeProjectLimit) return 'pro';
  return 'unlimited';
}
