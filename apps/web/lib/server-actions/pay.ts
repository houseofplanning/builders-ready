'use server';

import { createCheckoutForInvoice } from '@/lib/checkout';
import { createSupabaseServer } from '@/lib/supabase-server';
import { resolveCurrentTenant } from '@/lib/tenant-resolver';

export interface PayActionResult {
  ok: boolean;
  error?: string;
  url?: string;
}

/**
 * Web "Pay now": create a Stripe Checkout Session for an invoice and return the
 * hosted URL for the client to be redirected to. Callable by anyone with
 * project access. Marking paid happens later via the reconciliation webhook.
 */
export async function createInvoiceCheckout(
  invoiceId: string,
): Promise<PayActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const supabase = await createSupabaseServer();
  return createCheckoutForInvoice({
    supabase,
    invoiceId,
    callerTenantId: tenant.tenant.id,
    slug: tenant.tenant.slug,
  });
}
