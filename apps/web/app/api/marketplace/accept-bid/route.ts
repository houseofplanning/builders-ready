import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { distributeStages, stagesForTemplate } from '@br/shared';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Mobile "accept bid" endpoint. A customer accepts a trade's bid; we create the
 * project under the winning trade's tenant (service role — the customer can't
 * write there via RLS), mark the request matched, and decline the other bids.
 *
 * Auth: Authorization: Bearer <supabase access_token>.
 * Body: { "bid_id": "<uuid>" }
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });

  let bidId: string | undefined;
  try {
    const body = await req.json();
    bidId = typeof body?.bid_id === 'string' ? body.bid_id : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!bidId) return NextResponse.json({ error: 'bid_id is required.' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Supabase env not configured.' }, { status: 500 });
  }
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth } = await authed.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const userId = auth.user.id;

  const admin = getSupabaseAdmin();
  const { data: bid } = await admin
    .from('bids')
    .select('id, job_request_id, tenant_id, amount_pence, status')
    .eq('id', bidId)
    .maybeSingle();
  if (!bid) return NextResponse.json({ error: 'Bid not found.' }, { status: 404 });

  const { data: job } = await admin
    .from('job_requests')
    .select('id, customer_id, title, address_line1, city, postcode, status')
    .eq('id', bid.job_request_id)
    .maybeSingle();
  if (!job || job.customer_id !== userId) {
    return NextResponse.json({ error: 'This is not your request.' }, { status: 403 });
  }
  if (job.status !== 'open') {
    return NextResponse.json({ error: 'This request is no longer open.' }, { status: 409 });
  }

  const { data: trade } = await admin
    .from('tenants')
    .select('owner_user_id')
    .eq('id', bid.tenant_id)
    .maybeSingle();
  if (!trade) return NextResponse.json({ error: 'Trade not found.' }, { status: 404 });

  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const end = new Date(today.getTime() + 56 * 86_400_000).toISOString().slice(0, 10);

  const { data: project, error: projErr } = await admin
    .from('projects')
    .insert({
      tenant_id: bid.tenant_id,
      name: job.title,
      address_line1: job.address_line1 ?? job.postcode,
      city: job.city ?? job.postcode,
      postcode: job.postcode,
      client_id: userId,
      pm_id: trade.owner_user_id,
      start_date: start,
      estimated_end_date: end,
      quoted_amount_pence: bid.amount_pence ?? null,
      project_type: null,
    })
    .select('id')
    .single();
  if (projErr) {
    if (projErr.message.toLowerCase().includes('limit')) {
      return NextResponse.json(
        { error: 'This trade has reached their plan limit — ask them to free up a slot.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: projErr.message }, { status: 400 });
  }

  const stageRows = distributeStages(start, end, stagesForTemplate(null)).map((s) => ({
    tenant_id: bid.tenant_id,
    project_id: project.id,
    position: s.position,
    name: s.name,
    start_date: s.start_date,
    target_end_date: s.target_end_date,
    status: 'not_started' as const,
  }));
  if (stageRows.length > 0) await admin.from('project_stages').insert(stageRows);

  await admin
    .from('job_requests')
    .update({ status: 'matched', matched_bid_id: bid.id, matched_project_id: project.id })
    .eq('id', job.id);
  await admin.from('bids').update({ status: 'accepted' }).eq('id', bid.id);
  await admin
    .from('bids')
    .update({ status: 'declined' })
    .eq('job_request_id', job.id)
    .neq('id', bid.id)
    .neq('status', 'withdrawn');

  return NextResponse.json({ ok: true, project_id: project.id });
}
