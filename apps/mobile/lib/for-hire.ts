import { supabase } from './supabase';

export interface ForHireProfile {
  discoverable: boolean;
  day_rate_pence: number | null;
  day_rate_unit: 'day' | 'hour';
  for_hire_trades: string[];
  service_area: string | null;
}

export async function getForHireProfile(tenantId: string): Promise<ForHireProfile> {
  const { data } = await supabase
    .from('tenants')
    .select('discoverable, day_rate_pence, day_rate_unit, for_hire_trades, service_area')
    .eq('id', tenantId)
    .single();
  return {
    discoverable: Boolean(data?.discoverable),
    day_rate_pence: (data?.day_rate_pence as number | null) ?? null,
    day_rate_unit: ((data?.day_rate_unit as string | null) ?? 'day') === 'hour' ? 'hour' : 'day',
    for_hire_trades: (data?.for_hire_trades as string[] | null) ?? [],
    service_area: (data?.service_area as string | null) ?? null,
  };
}

export async function saveForHireProfile(tenantId: string, p: ForHireProfile): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({
      discoverable: p.discoverable,
      day_rate_pence: p.day_rate_pence,
      day_rate_unit: p.day_rate_unit,
      for_hire_trades: p.for_hire_trades.slice(0, 20),
      service_area: p.service_area?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId);
  if (error) throw error;
}

export interface OpenSubJob {
  id: string;
  tenant_id: string;
  trade: string | null;
  title: string;
  description: string | null;
  area: string | null;
  duration_note: string | null;
  budget_note: string | null;
  created_at: string;
  poster_name: string;
  my_bid_status: string | null;
}

export async function listOpenSubJobs(myTenantId: string): Promise<OpenSubJob[]> {
  const { data: posts } = await supabase
    .from('sub_job_posts')
    .select('id, tenant_id, trade, title, description, area, duration_note, budget_note, created_at')
    .eq('status', 'open')
    .neq('tenant_id', myTenantId)
    .order('created_at', { ascending: false });
  const rows = (posts ?? []) as Omit<OpenSubJob, 'poster_name' | 'my_bid_status'>[];
  if (rows.length === 0) return [];

  const posterIds = [...new Set(rows.map((r) => r.tenant_id))];
  const { data: names } = await supabase.from('trades_public').select('id, name').in('id', posterIds);
  const nameMap = new Map((names ?? []).map((n) => [(n as { id: string }).id, (n as { name: string }).name]));

  const { data: myBids } = await supabase
    .from('sub_job_bids')
    .select('post_id, status')
    .eq('bidder_tenant_id', myTenantId);
  const bidMap = new Map((myBids ?? []).map((b) => [(b as { post_id: string }).post_id, (b as { status: string }).status]));

  return rows.map((r) => ({
    ...r,
    poster_name: nameMap.get(r.tenant_id) ?? 'A builder',
    my_bid_status: bidMap.get(r.id) ?? null,
  }));
}

export async function placeSubBid(input: {
  post_id: string;
  my_tenant_id: string;
  amount_pence: number | null;
  message: string | null;
}): Promise<void> {
  const { error } = await supabase.from('sub_job_bids').insert({
    post_id: input.post_id,
    bidder_tenant_id: input.my_tenant_id,
    amount_pence: input.amount_pence,
    message: input.message?.trim() || null,
  });
  if (error) throw error;
}
