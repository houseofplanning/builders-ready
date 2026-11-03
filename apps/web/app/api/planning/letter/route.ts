import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatDate } from '@br/shared';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { renderLetterPdfBuffer } from '@/lib/pdf/letter';
import { sendPlanningLetterEmail } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Planning Radar — draft an occupier letter, render a branded PDF, and email it
 * to the BUILDER's own address so they can print and post it. No homeowner
 * contact data is used. The app counterpart of a "draft a letter" action.
 *
 * Auth: Authorization: Bearer <supabase access_token>.
 * Body: { listing_id: string, body: string }
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });

  let listingId: string | undefined;
  let body: string | undefined;
  try {
    const json = await req.json();
    listingId = typeof json?.listing_id === 'string' ? json.listing_id : undefined;
    body = typeof json?.body === 'string' ? json.body : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!listingId || !body || !body.trim()) {
    return NextResponse.json({ error: 'listing_id and body are required.' }, { status: 400 });
  }

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
  const userEmail = authData.user.email ?? null;

  const admin = getSupabaseAdmin();

  // Caller's tenant (trade).
  const { data: member } = await admin
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('user_id', userId)
    .maybeSingle();
  if (!member || (member.role !== 'owner' && member.role !== 'pm')) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, brand_primary, business_email, business_phone, logo_url')
    .eq('id', member.tenant_id)
    .maybeSingle();
  if (!tenant) return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });

  // Fetch the logo once and inline it as a data URI so @react-pdf renders it
  // reliably (no remote fetch at render time).
  let logoDataUri: string | null = null;
  if (tenant.logo_url) {
    try {
      const imgRes = await fetch(tenant.logo_url as string);
      if (imgRes.ok) {
        const ab = await imgRes.arrayBuffer();
        const ct = imgRes.headers.get('content-type') ?? 'image/png';
        logoDataUri = `data:${ct};base64,${Buffer.from(ab).toString('base64')}`;
      }
    } catch {
      // fall back to the text business name
    }
  }

  const { data: listing } = await admin
    .from('planning_listings')
    .select('id, address, postcode')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: 'Planning job not found.' }, { status: 404 });

  // Email goes to the builder's own address: their business email, else their
  // login email.
  const to = (tenant.business_email as string | null)?.trim() || userEmail;
  if (!to) {
    return NextResponse.json({ error: 'No email on file to send to.' }, { status: 400 });
  }

  let pdf: Buffer;
  try {
    pdf = await renderLetterPdfBuffer({
      tenant: {
        name: tenant.name,
        brand_primary: tenant.brand_primary,
        business_email: tenant.business_email,
        business_phone: tenant.business_phone,
        logoDataUri,
      },
      body,
      siteAddress: listing.address,
      dateLabel: formatDate(new Date().toISOString()),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not render the letter: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 },
    );
  }

  // Record the letter (best effort — don't fail the send over it).
  try {
    await admin.from('planning_letters').insert({
      listing_id: listing.id,
      tenant_id: tenant.id,
      created_by: userId,
      body,
      emailed_at: new Date().toISOString(),
    });
  } catch {
    // ignore
  }

  try {
    await sendPlanningLetterEmail({
      to,
      businessName: tenant.name,
      siteAddress: listing.address,
      pdf,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not email the letter: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, to });
}
