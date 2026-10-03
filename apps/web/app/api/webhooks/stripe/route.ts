import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { gbp } from '@br/shared';
import { getStripe, tierForPriceId } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  sendCancellationEmail,
  sendCancellationNotification,
  sendPaymentReceiptEmail,
  sendPaymentReceivedNotification,
} from '@/lib/email';

/**
 * Stripe webhook receiver for Builders Ready subscriptions.
 *
 * Idempotent via the public.webhook_events table — repeat events are
 * stamped once and ignored on retry. Signature is verified against
 * STRIPE_WEBHOOK_SECRET.
 *
 * Events handled:
 *   Subscriptions:
 *   - customer.subscription.created / updated / deleted
 *   - invoice.payment_succeeded / payment_failed
 *   - customer.subscription.trial_will_end
 *   Connect (client payments):
 *   - account.updated                        (builder payout status)
 *   - checkout.session.completed             (invoice paid — card)
 *   - checkout.session.async_payment_succeeded (invoice paid — Pay by Bank)
 *   - charge.refunded                        (invoice refunded)
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
      case 'account.updated':
        // Connect: a builder's connected account changed (finished onboarding,
        // capabilities enabled/disabled). Mirror the flags onto the tenant.
        tenantId = await handleConnectAccountUpdated(
          event.data.object as Stripe.Account,
        );
        break;
      case 'checkout.session.completed': {
        // A client paid an invoice. For synchronous methods (card) the payment
        // is already settled; for async methods (Pay by Bank) it may still be
        // processing — only mark paid once payment_status is 'paid'.
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          tenantId = await handleInvoicePaid(session);
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded':
        tenantId = await handleInvoicePaid(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'charge.refunded':
        // A milestone/invoice payment was refunded (by the builder or in the
        // Stripe dashboard). Flip the invoice to 'refunded'.
        tenantId = await handleChargeRefunded(event.data.object as Stripe.Charge);
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
  const { data: tenant } = await admin
    .from('tenants')
    .update({
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
    })
    .eq('id', tenantId)
    .select('name, business_email, subscription_tier')
    .maybeSingle();

  // Best-effort: the owner's name for a personal win-back email.
  let ownerName = '';
  const { data: owner } = await admin
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .maybeSingle();
  if (owner?.user_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', owner.user_id)
      .maybeSingle();
    ownerName = profile?.full_name ?? '';
  }

  // Win-back email + ops alert. Awaited so the serverless function doesn't
  // freeze mid-send; errors are swallowed so a failed email never fails the
  // webhook (which would make Stripe retry the event).
  if (tenant?.business_email) {
    await Promise.all([
      sendCancellationEmail({
        to: tenant.business_email,
        ownerName,
        businessName: tenant.name,
      }).catch((e) => console.error('[cancel] customer email failed', e)),
      sendCancellationNotification({
        businessName: tenant.name,
        ownerEmail: tenant.business_email,
        tier: tenant.subscription_tier ?? 'starter',
      }).catch((e) => console.error('[cancel] notification failed', e)),
    ]);
  }
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

function paidViaFromSession(
  session: Stripe.Checkout.Session,
): 'card' | 'bank' | 'manual' | null {
  // Best-effort only: with automatic payment methods, payment_method_types
  // lists everything eligible, so we can only be confident when exactly one
  // method applies. Precise per-charge detection is a Phase 4 refinement.
  // Cast to string[] so comparing against method names Stripe's union may not
  // include (e.g. 'pay_by_bank') isn't a compile error.
  const types = (session.payment_method_types ?? []) as string[];
  if (types.length === 1) {
    if (types[0] === 'card') return 'card';
    if (types[0] === 'pay_by_bank' || types[0] === 'bacs_debit') return 'bank';
  }
  return null;
}

async function handleInvoicePaid(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const invoiceId =
    session.metadata?.invoice_id ?? session.client_reference_id ?? null;
  const metaTenantId = session.metadata?.tenant_id ?? null;
  const admin = getSupabaseAdmin();

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const patch = {
    status: 'paid' as const,
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId,
    paid_reference: paymentIntentId,
    paid_via: paidViaFromSession(session),
  };

  const cols =
    'id, tenant_id, project_id, number, title, amount_gbp_pence, platform_fee_pence, paid_via';
  // Locate the invoice by its id (preferred) or by the stored session id.
  // .neq('status','paid') keeps it idempotent — a retried event is a no-op,
  // so the receipt emails below only fire once.
  const query = admin.from('invoices').update(patch).neq('status', 'paid');
  const { data } = invoiceId
    ? await query.eq('id', invoiceId).select(cols).maybeSingle()
    : await query
        .eq('stripe_checkout_session_id', session.id)
        .select(cols)
        .maybeSingle();

  if (data) {
    await sendPaymentEmails(admin, data).catch((e) =>
      console.error('[payment emails] failed', e),
    );
  }
  return (data?.tenant_id as string | null) ?? metaTenantId;
}

/** Best-effort receipt to the client + "you've been paid" to the builder. */
async function sendPaymentEmails(
  admin: ReturnType<typeof getSupabaseAdmin>,
  invoice: {
    tenant_id: string;
    project_id: string;
    number: string;
    title: string;
    amount_gbp_pence: number | string;
    platform_fee_pence: number | string | null;
    paid_via: 'card' | 'bank' | 'manual' | null;
  },
): Promise<void> {
  const [{ data: tenant }, { data: project }] = await Promise.all([
    admin
      .from('tenants')
      .select('name, business_email')
      .eq('id', invoice.tenant_id)
      .maybeSingle(),
    admin
      .from('projects')
      .select('client:profiles!projects_client_id_fkey(full_name, email)')
      .eq('id', invoice.project_id)
      .maybeSingle(),
  ]);

  const businessName = tenant?.name ?? 'Your builder';
  const amountLabel = gbp(Number(invoice.amount_gbp_pence));
  const feeLabel = gbp(Number(invoice.platform_fee_pence ?? 0));

  const clientRel = project?.client as
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
  const client = Array.isArray(clientRel) ? clientRel[0] : clientRel;

  const tasks: Promise<void>[] = [];
  if (client?.email) {
    tasks.push(
      sendPaymentReceiptEmail({
        to: client.email,
        clientName: client.full_name ?? 'there',
        businessName,
        invoiceNumber: invoice.number,
        invoiceTitle: invoice.title,
        amountLabel,
        paidVia: invoice.paid_via,
      }),
    );
  }
  if (tenant?.business_email) {
    tasks.push(
      sendPaymentReceivedNotification({
        to: tenant.business_email,
        businessName,
        clientName: client?.full_name ?? 'Your client',
        invoiceNumber: invoice.number,
        invoiceTitle: invoice.title,
        amountLabel,
        feeLabel,
      }),
    );
  }
  await Promise.all(tasks);
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
): Promise<string | null> {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);
  if (!paymentIntentId) return null;

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('invoices')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refunded_amount_pence: charge.amount_refunded,
    })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .neq('status', 'refunded')
    .select('tenant_id')
    .maybeSingle();
  return (data?.tenant_id as string | null) ?? null;
}

async function handleConnectAccountUpdated(
  account: Stripe.Account,
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  // Prefer the tenant_id we stamped at account creation; fall back to the
  // account id we stored on the tenant.
  const tenantId = account.metadata?.tenant_id ?? null;
  // Note: connect_onboarded_at is set once by refreshConnectStatus on the
  // owner's return from onboarding (it coalesces), so we don't touch it here —
  // that avoids the timestamp drifting on every later account.updated event.
  const query = admin
    .from('tenants')
    .update({
      connect_charges_enabled: !!account.charges_enabled,
      connect_payouts_enabled: !!account.payouts_enabled,
      connect_details_submitted: !!account.details_submitted,
    });
  const { data } = tenantId
    ? await query.eq('id', tenantId).select('id').maybeSingle()
    : await query
        .eq('stripe_connect_account_id', account.id)
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
