import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { platformFeePence, type SubscriptionTier } from '@br/shared';
import { getStripe, appUrl } from './stripe';
import { getSupabaseAdmin } from './supabase-admin';

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  url?: string;
}

/**
 * Core "pay an invoice" logic, shared by the web server action and the mobile
 * API route. Creates a Stripe Checkout Session as a DIRECT charge on the
 * builder's connected account, with a flat platform application fee. The
 * caller must pass a Supabase client already scoped to the paying user (RLS
 * gates the invoice read) plus that user's tenant id.
 *
 * The invoice is only marked paid later by the reconciliation webhook.
 */
export async function createCheckoutForInvoice(opts: {
  supabase: SupabaseClient;
  invoiceId: string;
  callerTenantId: string;
  slug: string;
  /** Override redirect targets (mobile points these at /pay/complete). */
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CheckoutResult> {
  const { supabase, invoiceId, callerTenantId, slug } = opts;

  // RLS (invoices_read = has_project_access) gates this read.
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, tenant_id, project_id, number, title, amount_gbp_pence, status')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) return { ok: false, error: 'Invoice not found.' };
  if (invoice.tenant_id !== callerTenantId) {
    return { ok: false, error: 'Not authorised for this invoice.' };
  }
  if (invoice.status === 'paid') {
    return { ok: false, error: 'This invoice has already been paid.' };
  }
  if (invoice.status === 'cancelled') {
    return { ok: false, error: 'This invoice has been cancelled.' };
  }

  const admin = getSupabaseAdmin();
  const { data: t } = await admin
    .from('tenants')
    .select('stripe_connect_account_id, connect_charges_enabled, subscription_tier')
    .eq('id', invoice.tenant_id)
    .maybeSingle();
  if (!t?.stripe_connect_account_id || !t.connect_charges_enabled) {
    return {
      ok: false,
      error: 'Online payments aren’t set up for this builder yet.',
    };
  }

  const fee = platformFeePence(
    (t.subscription_tier ?? 'starter') as SubscriptionTier,
  );
  const amount = Number(invoice.amount_gbp_pence);

  const successUrl =
    opts.successUrl ??
    `${appUrl()}/${slug}/projects/${invoice.project_id}?pay=success`;
  const cancelUrl =
    opts.cancelUrl ??
    `${appUrl()}/${slug}/projects/${invoice.project_id}?pay=cancelled`;

  try {
    const session = await getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: { name: `${invoice.number} — ${invoice.title}` },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          description: `${invoice.number} — ${invoice.title}`,
          ...(fee > 0 ? { application_fee_amount: fee } : {}),
          metadata: {
            invoice_id: invoice.id,
            tenant_id: invoice.tenant_id,
            project_id: invoice.project_id,
          },
        },
        client_reference_id: invoice.id,
        metadata: {
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id,
          project_id: invoice.project_id,
          platform_fee_pence: String(fee),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      { stripeAccount: t.stripe_connect_account_id },
    );

    await admin
      .from('invoices')
      .update({
        stripe_checkout_session_id: session.id,
        platform_fee_pence: fee,
      })
      .eq('id', invoice.id);

    if (!session.url) {
      return { ok: false, error: 'Stripe did not return a checkout URL.' };
    }
    return { ok: true, url: session.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not start checkout.',
    };
  }
}
