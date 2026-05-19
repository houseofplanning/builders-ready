import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, tierForPriceId } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Stripe webhook receiver for Builders Ready subscriptions.
 *
 * Idempotent via the public.webhook_events table — repeat events are
 * stamped once and ignored on retry. Signature is verified against
 * STRIPE_WEBHOOK_SECRET.
 *
 * Events handled:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 *   - customer.subscription.trial_will_end
 */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured on the server' },
      { status: 500 },
    );
  }

  // Stripe needs the RAW body for signature verification — req.text()
  // gives us the unparsed string.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  // Idempotency: skip if we've seen this stripe_event_id before.
  const { data: existing } = await admin
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ received: true, deduped: true });
  }

  // Record the event up front so retries during our own handler don't
  // double-apply side-effects.
  let tenantId: string | null = null;

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        tenantId = await handleSubscriptionChange(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        tenantId = await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_failed':
        tenantId = await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_succeeded':
        tenantId = await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.trial_will_end':
        // No DB update — Resend "your trial ends in 3 days" email can fire
        // here in a polish session.
        break;
      default:
        // Stripe sends many events we don't care about; just ack.
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json(
      { error: 'Handler error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }

  await admin.from('webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    tenant_id: tenantId,
    payload: event as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ received: true });
}

// -------------------------------------------------------------------------
// handlers
// -------------------------------------------------------------------------

type TenantUpdate = {
  stripe_subscription_id?: string | null;
  subscription_status?:
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'cancelled'
    | 'unpaid'
    | 'suspended';
  subscription_tier?: 'starter' | 'pro' | 'unlimited';
  trial_ends_at?: string | null;
  current_period_end?: string | null;
};

function mapStripeStatus(
  s: Stripe.Subscription.Status,
): TenantUpdate['subscription_status'] {
  switch (s) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'canceled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'past_due';
    default:
      return 'past_due';
  }
}

function toIso(secondsOrNull: number | null | undefined): string | null {
  if (!secondsOrNull) return null;
  return new Date(secondsOrNull * 1000).toISOString();
}

async function findTenantBySubscriptionContext(
  sub: Stripe.Subscription,
): Promise<string | null> {
  // Prefer the subscription metadata.tenant_id (we set it at Checkout time).
  const meta = sub.metadata?.tenant_id;
  if (meta) return meta;
  // Fall back to the customer's stripe_customer_id on tenants.
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const tenantId = await findTenantBySubscriptionContext(sub);
  if (!tenantId) {
    console.warn(`stripe webhook: no tenant found for subscription ${sub.id}`);
    return null;
  }

  const priceId = sub.items.data[0]?.price.id ?? '';
  const tier = tierForPriceId(priceId);

  const update: TenantUpdate = {
    stripe_subscription_id: sub.id,
    subscription_status: mapStripeStatus(sub.status),
    trial_ends_at: toIso(sub.trial_end),
    current_period_end: toIso(sub.current_period_end),
  };
  if (tier) update.subscription_tier = tier;

  const admin = getSupabaseAdmin();
  await admin.from('tenants').update(update).eq('id', tenantId);
  return tenantId;
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const tenantId = await findTenantBySubscriptionContext(sub);
  if (!tenantId) return null;
  const admin = getSupabaseAdmin();
  await admin
    .from('tenants')
    .update({
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
    })
    .eq('id', tenantId);
  return tenantId;
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return null;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('tenants')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_customer_id', customerId)
    .select('id')
    .maybeSingle();
  return data?.id ?? null;
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  // If we were past_due and a payment lands, flip to active. Otherwise
  // no-op — Stripe tracks normal billing cycles, we don't need to mirror.
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return null;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('tenants')
    .update({ subscription_status: 'active' })
    .eq('stripe_customer_id', customerId)
    .eq('subscription_status', 'past_due')
    .select('id')
    .maybeSingle();
  return data?.id ?? null;
}
