import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCheckoutForInvoice } from '@/lib/checkout';
import { appUrl } from '@/lib/stripe';

/**
 * Mobile customer "pay invoice" endpoint. A marketplace customer (project
 * client, no tenant) pays a staged invoice. The invoice read is RLS-gated to
 * the project client, so we pass its own tenant_id to the shared checkout core.
 *
 * Auth: Authorization: Bearer <supabase access_token>. Body: { invoice_id }
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });

  let invoiceId: string | undefined;
  try {
    const body = await req.json();
    invoiceId = typeof body?.invoice_id === 'string' ? body.invoice_id : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!invoiceId) return NextResponse.json({ error: 'invoice_id is required.' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Supabase env not configured.' }, { status: 500 });
  }
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  // RLS gates this read to the project client.
  const { data: inv } = await supabase
    .from('invoices')
    .select('tenant_id, project_id')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });

  const result = await createCheckoutForInvoice({
    supabase,
    invoiceId,
    callerTenantId: inv.tenant_id,
    slug: '',
    successUrl: `${appUrl()}/pay/complete?status=success`,
    cancelUrl: `${appUrl()}/pay/complete?status=cancelled`,
  });
  if (!result.ok || !result.url) {
    return NextResponse.json({ error: result.error ?? 'Could not start payment.' }, { status: 400 });
  }
  return NextResponse.json({ url: result.url });
}
