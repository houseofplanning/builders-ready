'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type Stripe from 'stripe';
import { TIERS, type SubscriptionTier } from '@br/shared';
import { getSupabaseAdmin } from '../supabase-admin';
import { resolveCurrentTenant } from '../tenant-resolver';
import { resolveOffer } from '../offers';
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

  // 2) Resolve any time-limited acquisition offer (?offer= -> br_offer cookie)
  const cookieStore = await cookies();
  const offer = resolveOffer(cookieStore.get('br_offer')?.value);

  // 3) Create the Checkout Session
  const baseParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        ...(offer ? { offer: offer.slug } : {}),
      },
    },
    // Force card collection during trial so day-15 auto-charge works.
    payment_method_collection: 'always',
    // NOT VAT-registered yet — do not charge or auto-calculate VAT. When the
    // company registers for VAT, set automatic_tax.enabled=true again, re-add
    // tax_id_collection, restore customer_update.address='auto', and configure
    // the VAT registration in Stripe Tax settings.
    automatic_tax: { enabled: false },
    customer_update: { name: 'auto' },
    success_url: `${appUrl()}/onboarding/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/onboarding/billing?cancelled=1`,
    metadata: {
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      tier,
      cadence,
      ...(offer ? { offer: offer.slug } : {}),
    },
  };

  // `discounts` and `allow_promotion_codes` are mutually exclusive. When a
  // valid offer is present we stack its coupons; otherwise we leave the
  // manual promo-code box open at checkout. If the offer's coupons are
  // expired/invalid (e.g. past redeem_by), Stripe throws — so we fall back
  // to a normal checkout rather than block the signup.
  let session;
  if (offer) {
    try {
      session = await stripe.checkout.sessions.create({
        ...baseParams,
        discounts: offer.coupons.map((coupon) => ({ coupon })),
      });
    } catch {
      session = await stripe.checkout.sessions.create({
        ...baseParams,
        allow_promotion_codes: true,
      });
    }
  } else {
    session = await stripe.checkout.sessions.create({
      ...baseParams,
      allow_promotion_codes: true,
    });
  }

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
