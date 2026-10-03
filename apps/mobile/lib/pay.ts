import { supabase } from './supabase';
import type { UUID } from '@br/shared';

/**
 * Base URL of the Builders Ready web app, which hosts the pay endpoint.
 * Override with EXPO_PUBLIC_WEB_URL if the domain changes.
 */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://buildersready.uk';

/**
 * Ask the web pay endpoint to create a Stripe Checkout Session for an invoice
 * and return the hosted URL. The app opens that URL in the browser; the invoice
 * flips to Paid via the reconciliation webhook once payment completes.
 */
export async function getInvoiceCheckoutUrl(invoiceId: UUID): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again to pay.');

  const res = await fetch(`${WEB_URL}/api/pay/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? 'Could not start payment.');
  }
  return json.url;
}
