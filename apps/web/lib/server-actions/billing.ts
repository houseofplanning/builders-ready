'use server';

import 'server-only';
import { z } from 'zod';
import { TIERS, type SubscriptionTier } from '@br/shared';
import { getSupabaseAdmin } from '../supabase-admin';
import { resolveCurrentTenant } from '../tenant-resolver';
import {
  appUrl,
  getStripe,
  priceIdFor,
  type Cadence,
} from '../stripe';

// -------------------------------------------------------------------------
// createCheckoutSession
// -------------------------------------------------------------------------
const checkoutSchema = z.object({
  cadence: z.enum(['monthly', 'annual']),
});

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  /** Stripe-hosted Checkout URL — client should redirect to it. */
  url?: string;
}

/**
 * Build (and persist) a Stripe Customer for the calling user's tenant if
 * one doesn't exist, then create a Checkout Session that:
 *
 *   - subscribes the customer to the tenant's chosen tier price
 *   - includes a 14-day trial (no charge today)
 *   - REQUIRES a card (payment method) up-front so we can auto-bill on day 15
 *   - on success, lands the user back on /onboarding/branding
 *   - on cancel, returns them to /onboarding/billing
 *
 * Webhook handler (customer.subscription.created/updated) actually writes
 * stripe_subscription_id, trial_ends_at, current_period_end onto the
 * tenant row. This action only stamps stripe_customer_id pre-emptively so
 * if the user bails mid-Checkout we don't keep creating new customers.
 */
export async function createCheckoutSession(
  raw: Record<string, unknown>,
): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Pick monthly or annual.' };
  const { cadence } = parsed.data;

  const tenantCtx = await resolveCurrentTenant();
  if (!tenantCtx) return { ok: false, error: 'Not signed in.' };
  if (tenantCtx.role !== 'owner') {
    return { ok: false, error: 'Only the tenant owner can set up billing.' };
  }
  const { tenant, user_id } = tenantCtx;

  const tier: SubscriptionTier = tenant.subscription_tier ?? 'starter';
  const priceId = priceIdFor(tier, cadence as Cadence);
  if (!priceId) {
    return {
      ok: false,
      error: `Stripe price ID missing for ${tier} / ${cadence}. Run apps/web/scripts/init-stripe.ts then paste the IDs into .env.local.`,
    };
  }

  const stripe = getStripe();
  const admin = getSupabaseAdmin();

  // 1) Ensure the tenant has a Stripe Customer
  let customerId = tenant.stripe_customer_id;
  if (!customerId) {
    // Look up email from the auth user
    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .maybeSingle();
    const customer = await stripe.customers.create({
      email: profile?.email ?? tenant.business_email,
      name: tenant.name,
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        owner_user_id: user_id,
      },
    });
    customerId = customer.id;
    const { error: updErr } = await admin
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenant.id);
    if (updErr) {
      return { ok: false, error: `Could not persist customer: ${updErr.message}` };
    }
  }

  // 2) Create the Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
      },
    },
    // Force card collection during trial so day-15 auto-charge works.
    payment_method_collection: 'always',
    automatic_tax: { enabled: true },
    customer_update: { name: 'auto', address: 'auto' },
    tax_id_collection: { enabled: true },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/onboarding/branding?stripe=success`,
    cancel_url: `${appUrl()}/onboarding/billing?cancelled=1`,
    metadata: {
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      tier,
      cadence,
    },
  });

  if (!session.url) {
    return { ok: false, error: 'Stripe did not return a Checkout URL.' };
  }

  return { ok: true, url: session.url };
}

// -------------------------------------------------------------------------
// createPortalSession — Stripe Customer Portal for managing billing later
// -------------------------------------------------------------------------
export interface PortalResult {
  ok: boolean;
  error?: string;
  url?: string;
}

export async function createPortalSession(): Promise<PortalResult> {
  const tenantCtx = await resolveCurrentTenant();
  if (!tenantCtx) return { ok: false, error: 'Not signed in.' };
  if (tenantCtx.role !== 'owner') {
    return { ok: false, error: 'Only the tenant owner can manage billing.' };
  }
  const { tenant } = tenantCtx;
  if (!tenant.stripe_customer_id) {
    return {
      ok: false,
      error: 'No Stripe customer yet. Finish billing setup first.',
    };
  }
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${appUrl()}/${tenant.slug}/settings/billing`,
  });
  return { ok: true, url: session.url };
}

// -------------------------------------------------------------------------
// changeTier — switch tier from a settings page (mid-cycle prorated)
// -------------------------------------------------------------------------
const changeTierSchema = z.object({
  tier: z.enum(['starter', 'pro', 'unlimited']),
  cadence: z.enum(['monthly', 'annual']),
});

export interface ChangeTierResult {
  ok: boolean;
  error?: string;
}

export async function changeTier(
  raw: Record<string, unknown>,
): Promise<ChangeTierResult> {
  const parsed = changeTierSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };

  const tenantCtx = await resolveCurrentTenant();
  if (!tenantCtx) return { ok: false, error: 'Not signed in.' };
  if (tenantCtx.role !== 'owner') {
    return { ok: false, error: 'Only the tenant owner can change billing.' };
  }
  const { tenant } = tenantCtx;
  if (!tenant.stripe_subscription_id) {
    return { ok: false, error: 'No active subscription yet.' };
  }
  const priceId = priceIdFor(parsed.data.tier, parsed.data.cadence);
  if (!priceId) return { ok: false, error: 'Price ID missing.' };

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) return { ok: false, error: 'No subscription item found.' };

  await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'always_invoice',
  });
  // Webhook will update tenant.subscription_tier asynchronously.
  return { ok: true };
}

void TIERS; // type-only import keepalive
