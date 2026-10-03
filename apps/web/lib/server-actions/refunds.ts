'use server';

import { revalidatePath } from 'next/cache';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveCurrentTenant } from '@/lib/tenant-resolver';

export interface RefundActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Refund a paid invoice that was collected online. Owner/PM only. Creates a
 * full Stripe refund on the connected account (returning the platform fee too),
 * and flips the invoice to 'refunded'. The charge.refunded webhook mirrors the
 * same change as a backup, so a dashboard-initiated refund also syncs.
 */
export async function refundInvoiceOnWeb(
  invoiceId: string,
): Promise<RefundActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can issue refunds.' };
  }

  const admin = getSupabaseAdmin();
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, tenant_id, project_id, status, stripe_payment_intent_id')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice || invoice.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Invoice not found.' };
  }
  if (invoice.status !== 'paid') {
    return { ok: false, error: 'Only a paid invoice can be refunded.' };
  }
  if (!invoice.stripe_payment_intent_id) {
    return {
      ok: false,
      error: 'This invoice wasn’t paid online, so there’s nothing to refund here.',
    };
  }

  const { data: t } = await admin
    .from('tenants')
    .select('stripe_connect_account_id')
    .eq('id', invoice.tenant_id)
    .maybeSingle();
  if (!t?.stripe_connect_account_id) {
    return { ok: false, error: 'No connected account for this builder.' };
  }

  try {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: invoice.stripe_payment_intent_id,
        refund_application_fee: true,
      },
      { stripeAccount: t.stripe_connect_account_id },
    );
    await admin
      .from('invoices')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reference: refund.id,
        refunded_amount_pence: refund.amount,
      })
      .eq('id', invoice.id);

    revalidatePath(`/${tenant.tenant.slug}/projects/${invoice.project_id}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Refund failed.',
    };
  }
}
