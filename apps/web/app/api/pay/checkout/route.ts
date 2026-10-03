import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCheckoutForInvoice } from '@/lib/checkout';
import { appUrl } from '@/lib/stripe';

/**
 * Mobile "Pay now" endpoint. The app can't call web server actions, so it POSTs
 * here with its Supabase access token; we create the Stripe Checkout Session
 * and return the hosted URL for the app to open in the browser.
 *
 * Auth: Authorization: Bearer <supabase access_token>. The token scopes a
 * Supabase client so RLS gates the invoice read exactly as on the web.
 *
 * Body: { "invoice_id": "<uuid>" }
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });
  }

  let invoiceId: string | undefined;
  try {
    const body = await req.json();
    invoiceId = typeof body?.invoice_id === 'string' ? body.invoice_id : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!invoiceId) {
    return NextResponse.json({ error: 'invoice_id is required.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json(
      { error: 'Supabase env not configured.' },
      { status: 500 },
    );
  }

  // Token-scoped client — all reads run under the caller's RLS.
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id, tenant:tenants(slug)')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!membership?.tenant_id) {
    return NextResponse.json({ error: 'No tenant membership.' }, { status: 403 });
  }
  const tenantRel = membership.tenant as unknown as { slug: string } | { slug: string }[] | null;
  const slug = Array.isArray(tenantRel) ? tenantRel[0]?.slug : tenantRel?.slug;

  const result = await createCheckoutForInvoice({
    supabase,
    invoiceId,
    callerTenantId: membership.tenant_id as string,
    slug: slug ?? '',
    successUrl: `${appUrl()}/pay/complete?status=success`,
    cancelUrl: `${appUrl()}/pay/complete?status=cancelled`,
  });

  if (!result.ok || !result.url) {
    return NextResponse.json(
      { error: result.error ?? 'Could not start checkout.' },
      { status: 400 },
    );
  }
  return NextResponse.json({ url: result.url });
}
