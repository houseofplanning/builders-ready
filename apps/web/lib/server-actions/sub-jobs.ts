'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface SubJobResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface SubJobPost {
  id: string;
  tenant_id: string;
  trade: string | null;
  title: string;
  description: string | null;
  area: string | null;
  postcode: string | null;
  start_date: string | null;
  duration_note: string | null;
  budget_note: string | null;
  status: string;
  created_at: string;
}

export interface SubJobBid {
  id: string;
  post_id: string;
  bidder_tenant_id: string;
  amount_pence: number | null;
  message: string | null;
  status: string;
  created_at: string;
  bidder_name?: string | null;
}

async function ownerOrPm() {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { error: 'Not signed in.' as const };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { error: 'Only owners and PMs can do this.' as const };
  }
  return { tenant };
}

export async function createSubJobPost(input: {
  title: string;
  trade: string | null;
  description: string | null;
  area: string | null;
  start_date: string | null;
  duration_note: string | null;
  budget_note: string | null;
}): Promise<SubJobResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  if (!input.title.trim()) return { ok: false, error: 'Give the job a title.' };

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('sub_job_posts')
    .insert({
      tenant_id: tenant.tenant.id,
      title: input.title.trim(),
      trade: input.trade?.trim() || null,
      description: input.description?.trim() || null,
      area: input.area?.trim() || null,
      start_date: input.start_date || null,
      duration_note: input.duration_note?.trim() || null,
      budget_note: input.budget_note?.trim() || null,
      created_by: auth.user?.id ?? null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/hire`);
  return { ok: true, id: (data as { id: string }).id };
}

export async function listMySubJobPosts(): Promise<{ posts: SubJobPost[]; bids: SubJobBid[] }> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { posts: [], bids: [] };
  const supabase = await createSupabaseServer();
  const { data: posts } = await supabase
    .from('sub_job_posts')
    .select('*')
    .eq('tenant_id', tenant.tenant.id)
    .order('created_at', { ascending: false });
  const postIds = (posts ?? []).map((p) => (p as SubJobPost).id);
  let bids: SubJobBid[] = [];
  if (postIds.length) {
    const { data: bidRows } = await supabase
      .from('sub_job_bids')
      .select('*')
      .in('post_id', postIds)
      .order('created_at');
    bids = (bidRows ?? []) as SubJobBid[];
    // Attach bidder names from the public trade directory.
    const bidderIds = [...new Set(bids.map((b) => b.bidder_tenant_id))];
    if (bidderIds.length) {
      const { data: names } = await supabase
        .from('trades_public')
        .select('id, name')
        .in('id', bidderIds);
      const map = new Map((names ?? []).map((n) => [(n as { id: string }).id, (n as { name: string }).name]));
      bids = bids.map((b) => ({ ...b, bidder_name: map.get(b.bidder_tenant_id) ?? 'A trade' }));
    }
  }
  return { posts: (posts ?? []) as SubJobPost[], bids };
}

export async function acceptSubBid(bidId: string): Promise<SubJobResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('accept_sub_bid', { p_bid_id: bidId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/hire`);
  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  return { ok: true };
}

export async function closeSubJobPost(postId: string): Promise<SubJobResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('sub_job_posts')
    .update({ status: 'closed' })
    .eq('id', postId)
    .eq('tenant_id', tenant.tenant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/hire`);
  return { ok: true };
}

// --- For Hire side: browse open jobs from other builders and bid -----------
export async function listOpenSubJobs(): Promise<{ posts: (SubJobPost & { poster_name?: string | null; my_bid_status?: string | null })[] }> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { posts: [] };
  const supabase = await createSupabaseServer();
  const { data: posts } = await supabase
    .from('sub_job_posts')
    .select('*')
    .eq('status', 'open')
    .neq('tenant_id', tenant.tenant.id)
    .order('created_at', { ascending: false });
  const rows = (posts ?? []) as SubJobPost[];
  if (rows.length === 0) return { posts: [] };

  const posterIds = [...new Set(rows.map((p) => p.tenant_id))];
  const { data: names } = await supabase.from('trades_public').select('id, name').in('id', posterIds);
  const nameMap = new Map((names ?? []).map((n) => [(n as { id: string }).id, (n as { name: string }).name]));

  const { data: myBids } = await supabase
    .from('sub_job_bids')
    .select('post_id, status')
    .eq('bidder_tenant_id', tenant.tenant.id);
  const bidMap = new Map((myBids ?? []).map((b) => [(b as { post_id: string }).post_id, (b as { status: string }).status]));

  return {
    posts: rows.map((p) => ({
      ...p,
      poster_name: nameMap.get(p.tenant_id) ?? 'A builder',
      my_bid_status: bidMap.get(p.id) ?? null,
    })),
  };
}

export async function placeSubBid(input: {
  post_id: string;
  amount_pence: number | null;
  message: string | null;
}): Promise<SubJobResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('sub_job_bids').insert({
    post_id: input.post_id,
    bidder_tenant_id: tenant.tenant.id,
    amount_pence:
      input.amount_pence != null && Number.isFinite(input.amount_pence)
        ? Math.max(0, Math.round(input.amount_pence))
        : null,
    message: input.message?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/for-hire`);
  return { ok: true };
}
