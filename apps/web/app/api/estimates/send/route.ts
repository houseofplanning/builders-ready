import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { gbp, formatDate } from '@br/shared';
import type { Estimate, EstimateLineItem } from '@br/shared';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { renderEstimatePdfBuffer } from '@/lib/pdf/estimate';
import { sendEstimateEmail } from '@/lib/email';

export const runtime = 'nodejs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buildersready.uk';

/**
 * Mobile "send quote" endpoint — the app counterpart of sendEstimateOnWeb.
 * Renders the branded PDF, stores it, stamps the quote as sent (with a stable
 * accept_token), and EMAILS the client via Resend. Previously the app only
 * opened the native share sheet and marked the quote sent without ever
 * emailing the address the builder entered.
 *
 * Auth: Authorization: Bearer <supabase access_token>.
 * Body: { "estimate_id": "<uuid>" }
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });

  let estimateId: string | undefined;
  try {
    const body = await req.json();
    estimateId = typeof body?.estimate_id === 'string' ? body.estimate_id : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!estimateId) return NextResponse.json({ error: 'estimate_id is required.' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Supabase env not configured.' }, { status: 500 });
  }
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData } = await authed.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const userId = authData.user.id;

  const admin = getSupabaseAdmin();

  const { data: estRow } = await admin
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .maybeSingle();
  if (!estRow) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
  const estimate = estRow as Estimate;
  if (estimate.status === 'accepted') {
    return NextResponse.json({ error: 'This quote has already been accepted.' }, { status: 409 });
  }

  // Authorise: the caller must be an owner/PM of the quote's tenant.
  const { data: member } = await admin
    .from('tenant_members')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', estimate.tenant_id)
    .maybeSingle();
  if (!member || (member.role !== 'owner' && member.role !== 'pm')) {
    return NextResponse.json({ error: 'Not authorised to send this quote.' }, { status: 403 });
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select('name, brand_primary, business_email, business_phone, vat_number, company_number')
    .eq('id', estimate.tenant_id)
    .maybeSingle();
  if (!tenant) return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });

  const { data: lineRows } = await admin
    .from('estimate_line_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('position', { ascending: true });
  const lines = (lineRows ?? []) as EstimateLineItem[];

  const acceptToken = estimate.accept_token ?? randomBytes(24).toString('hex');

  let pdf: Buffer;
  try {
    pdf = await renderEstimatePdfBuffer({
      tenant: {
        name: tenant.name,
        brand_primary: tenant.brand_primary,
        business_email: tenant.business_email,
        business_phone: tenant.business_phone,
        vat_number: tenant.vat_number,
        company_number: tenant.company_number,
      },
      estimate,
      lines,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not render the PDF: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 },
    );
  }

  const path = `${estimate.tenant_id}/${estimate.id}.pdf`;
  const { error: upErr } = await admin.storage
    .from('estimate-pdfs')
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });

  const { error: updErr } = await admin
    .from('estimates')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      accept_token: acceptToken,
      pdf_storage_path: path,
    })
    .eq('id', estimateId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  const viewUrl = `${SITE_URL}/q/${acceptToken}`;

  // Email the client if we have an address — never fail the send over email.
  let emailed = false;
  if (estimate.client_email) {
    try {
      await sendEstimateEmail({
        to: estimate.client_email,
        businessName: tenant.name,
        clientName: estimate.client_name,
        quoteTitle: estimate.title,
        quoteNumber: estimate.number,
        totalLabel: gbp(Number(estimate.total_pence)),
        viewUrl,
        validUntilLabel: estimate.valid_until ? formatDate(estimate.valid_until) : null,
        pdf,
      });
      emailed = true;
    } catch (err) {
      console.error('[api/estimates/send] email failed', err);
    }
  }

  return NextResponse.json({
    ok: true,
    token: acceptToken,
    url: viewUrl,
    emailed,
    to: estimate.client_email ?? null,
  });
}
