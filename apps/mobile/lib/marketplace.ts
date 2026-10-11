import { supabase } from './supabase';
import type { UUID, JobRequestStatus, BidStatus } from '@br/shared';

/**
 * Mobile marketplace data helpers (trade side). All queries are RLS-scoped:
 * a trade (tenant member) can browse OPEN job_requests and jobs they've bid on,
 * bid on open jobs (RLS enforces an active subscription), and message the
 * customer. Same defensive, embed-free query style as the other libs.
 */

export interface JobListItem {
  id: UUID;
  title: string;
  trade_category: string;
  postcode: string;
  city: string | null;
  budget_min_pence: number | null;
  budget_max_pence: number | null;
  budget_note: string | null;
  photos: string[];
  bid_count: number;
  created_at: string;
}

export interface RichJobFields {
  timing: string | null;
  property_type: string | null;
  preferred_start_date: string | null;
  access_notes: string | null;
}

export interface JobDetail extends JobListItem, RichJobFields {
  customer_id: UUID;
  description: string | null;
  status: JobRequestStatus;
}

export interface BidRow {
  id: UUID;
  amount_pence: number | null;
  message: string | null;
  status: BidStatus;
  estimate_id: UUID | null;
}

function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

export async function listOpenJobRequests(opts: {
  category?: string;
}): Promise<JobListItem[]> {
  // Read from the feed so we get the live bid_count ("X of 5"). Postcode-
  // district filtering happens in the screen (so it matches the exact
  // posted postcode, UK-wide) rather than a prefix ilike here.
  let q = supabase
    .from('open_jobs_feed')
    .select(
      'id, title, trade_category, postcode, city, budget_min_pence, budget_max_pence, budget_note, photos, bid_count, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(60);
  if (opts.category) q = q.eq('trade_category', opts.category);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    trade_category: r.trade_category,
    postcode: r.postcode,
    city: r.city,
    budget_min_pence: num(r.budget_min_pence),
    budget_max_pence: num(r.budget_max_pence),
    budget_note: r.budget_note,
    photos: (r.photos as string[] | null) ?? [],
    bid_count: Number(r.bid_count ?? 0),
    created_at: r.created_at,
  }));
}

export interface TradeWonJob {
  job_id: UUID;
  title: string;
  trade_category: string;
  city: string | null;
  postcode: string;
  amount_pence: number | null;
  project_id: UUID | null;
  project_status: string | null;
}

/**
 * Jobs this trade has won (their bid was accepted), with the resulting
 * project's status so the Marketplace can show Hired (in progress) vs
 * Completed. Open jobs to bid on come from listOpenJobRequests.
 */
export async function listTradeWonJobs(tenantId: UUID): Promise<TradeWonJob[]> {
  const { data: bids } = await supabase
    .from('bids')
    .select('amount_pence, job_request_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'accepted');
  const bidRows = bids ?? [];
  if (bidRows.length === 0) return [];
  const amountByJob = new Map(bidRows.map((b) => [b.job_request_id as string, num(b.amount_pence)]));
  const jobIds = [...amountByJob.keys()];

  const { data: jobs } = await supabase
    .from('job_requests')
    .select('id, title, trade_category, city, postcode, matched_project_id, updated_at')
    .in('id', jobIds)
    .order('updated_at', { ascending: false });
  const jobRows = jobs ?? [];

  const projIds = jobRows.map((j) => j.matched_project_id).filter(Boolean) as string[];
  const statusByProject = new Map<string, string>();
  if (projIds.length) {
    const { data: projs } = await supabase.from('projects').select('id, status').in('id', projIds);
    (projs ?? []).forEach((p) => statusByProject.set(p.id as string, p.status as string));
  }

  return jobRows.map((j) => ({
    job_id: j.id,
    title: j.title,
    trade_category: j.trade_category,
    city: j.city,
    postcode: j.postcode,
    amount_pence: amountByJob.get(j.id) ?? null,
    project_id: j.matched_project_id,
    project_status: j.matched_project_id ? statusByProject.get(j.matched_project_id) ?? null : null,
  }));
}

export async function getJobRequest(id: UUID): Promise<JobDetail | null> {
  const { data: r } = await supabase
    .from('job_requests')
    .select(
      'id, customer_id, title, trade_category, description, postcode, city, budget_min_pence, budget_max_pence, budget_note, photos, timing, property_type, preferred_start_date, access_notes, status, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!r) return null;
  // Live bid count from the feed (trades can't count bids directly via RLS).
  const { data: feed } = await supabase
    .from('open_jobs_feed')
    .select('bid_count')
    .eq('id', id)
    .maybeSingle();
  return {
    id: r.id,
    customer_id: r.customer_id,
    title: r.title,
    trade_category: r.trade_category,
    description: r.description,
    postcode: r.postcode,
    city: r.city,
    budget_min_pence: num(r.budget_min_pence),
    budget_max_pence: num(r.budget_max_pence),
    budget_note: r.budget_note,
    photos: (r.photos as string[] | null) ?? [],
    timing: r.timing ?? null,
    property_type: r.property_type ?? null,
    preferred_start_date: r.preferred_start_date ?? null,
    access_notes: r.access_notes ?? null,
    bid_count: Number(feed?.bid_count ?? 0),
    status: r.status,
    created_at: r.created_at,
  };
}

export async function getMyBid(jobId: UUID, tenantId: UUID): Promise<BidRow | null> {
  const { data } = await supabase
    .from('bids')
    .select('id, amount_pence, message, status, estimate_id')
    .eq('job_request_id', jobId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    amount_pence: num(data.amount_pence),
    message: data.message,
    status: data.status,
    estimate_id: data.estimate_id ?? null,
  };
}

/**
 * Create a full itemized quote (a draft estimate) attached to an existing
 * bid, prefilled from the job, and link it via bids.estimate_id. The builder
 * then edits/sends it in the estimate editor. Returns the estimate id.
 */
export async function createQuoteForBid(params: {
  bid_id: UUID;
  tenant_id: UUID;
  created_by: UUID;
  job_title: string;
  city: string | null;
  postcode: string;
}): Promise<UUID> {
  const { createEstimate } = await import('./estimates');
  const estimateId = await createEstimate({
    tenant_id: params.tenant_id,
    created_by: params.created_by,
    title: params.job_title,
    project_type: null,
    client_name: 'Marketplace customer',
    client_email: null,
    client_phone: null,
    site_address_line1: null,
    site_address_line2: null,
    city: params.city,
    postcode: params.postcode,
    vat_mode: 'none',
    vat_rate_bp: 2000,
    client_detail_level: 'itemised',
    valid_until: null,
    notes: null,
    terms: null,
    lines: [],
  });
  const { error } = await supabase
    .from('bids')
    .update({ estimate_id: estimateId })
    .eq('id', params.bid_id);
  if (error) throw new Error(error.message);
  return estimateId;
}

export async function submitBid(params: {
  job_request_id: UUID;
  tenant_id: UUID;
  created_by: UUID;
  amount_pence?: number | null;
  message?: string | null;
  available_from?: string | null;
  duration_estimate?: string | null;
  warranty?: string | null;
  about?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('bids').insert({
    job_request_id: params.job_request_id,
    tenant_id: params.tenant_id,
    created_by: params.created_by,
    amount_pence: params.amount_pence ?? null,
    message: params.message ?? null,
    available_from: params.available_from ?? null,
    duration_estimate: params.duration_estimate ?? null,
    warranty: params.warranty ?? null,
    about: params.about ?? null,
  });
  if (error) {
    if (error.code === '23505') throw new Error('You have already bid on this job.');
    if (error.message.toLowerCase().includes('row-level security')) {
      throw new Error('Your subscription must be active to bid, and the job must still be open.');
    }
    throw new Error(error.message);
  }
}

// --- messaging -------------------------------------------------------------

export interface ThreadListItem {
  id: UUID;
  job_request_id: UUID;
  last_message_at: string | null;
  title: string;
}

export async function listTradeThreads(tenantId: UUID): Promise<ThreadListItem[]> {
  const { data: threads } = await supabase
    .from('marketplace_threads')
    .select('id, job_request_id, last_message_at')
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  const rows = threads ?? [];
  if (rows.length === 0) return [];

  const jobIds = Array.from(new Set(rows.map((t) => t.job_request_id)));
  const { data: jobs } = await supabase.from('job_requests').select('id, title').in('id', jobIds);
  const titleMap = new Map((jobs ?? []).map((j) => [j.id as string, j.title as string]));

  return rows.map((t) => ({
    id: t.id,
    job_request_id: t.job_request_id,
    last_message_at: t.last_message_at,
    title: titleMap.get(t.job_request_id) ?? 'Job enquiry',
  }));
}

export async function openThreadForJob(params: {
  job_request_id: UUID;
  tenant_id: UUID;
  customer_id: UUID;
}): Promise<UUID> {
  const { data: existing } = await supabase
    .from('marketplace_threads')
    .select('id')
    .eq('job_request_id', params.job_request_id)
    .eq('tenant_id', params.tenant_id)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase
    .from('marketplace_threads')
    .insert({
      job_request_id: params.job_request_id,
      customer_id: params.customer_id,
      tenant_id: params.tenant_id,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not start the conversation.');
  return data.id;
}

export interface ThreadMessageRow {
  id: UUID;
  sender_id: UUID;
  body: string;
  image_url: string | null;
  created_at: string;
}

export async function getThreadMessages(threadId: UUID): Promise<ThreadMessageRow[]> {
  const { data } = await supabase
    .from('marketplace_messages')
    .select('id, sender_id, body, image_url, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  return (data ?? []) as ThreadMessageRow[];
}

export async function sendMarketplaceMessage(params: {
  thread_id: UUID;
  sender_id: UUID;
  body: string;
  image_url?: string | null;
}): Promise<void> {
  const body = params.body.trim();
  if (!body && !params.image_url) throw new Error('Message is empty.');
  const { error } = await supabase.from('marketplace_messages').insert({
    thread_id: params.thread_id,
    sender_id: params.sender_id,
    body,
    image_url: params.image_url ?? null,
  });
  if (error) throw new Error(error.message);
  await supabase
    .from('marketplace_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', params.thread_id);
}

// ===========================================================================
// CUSTOMER SIDE
// ===========================================================================

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://buildersready.uk';

/** Create a marketplace customer account (no tenant) then sign in. */
export async function signUpCustomer(params: {
  full_name: string;
  email: string;
  password: string;
}): Promise<void> {
  const email = params.email.trim().toLowerCase();
  const res = await fetch(`${WEB_URL}/api/marketplace/customer-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: params.full_name.trim(), email, password: params.password }),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) throw new Error(json.error ?? 'Could not create account.');
  const { error } = await supabase.auth.signInWithPassword({ email, password: params.password });
  if (error) throw new Error(error.message);
}

/** The public, PII-free feed of open jobs (no poster identity). */
export async function browseOpenJobs(opts: {
  category?: string;
}): Promise<JobListItem[]> {
  let q = supabase
    .from('open_jobs_feed')
    .select(
      'id, title, trade_category, postcode, city, budget_min_pence, budget_max_pence, budget_note, photos, bid_count, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(60);
  if (opts.category) q = q.eq('trade_category', opts.category);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    trade_category: r.trade_category,
    postcode: r.postcode,
    city: r.city,
    budget_min_pence: num(r.budget_min_pence),
    budget_max_pence: num(r.budget_max_pence),
    budget_note: r.budget_note,
    photos: (r.photos as string[] | null) ?? [],
    bid_count: Number(r.bid_count ?? 0),
    created_at: r.created_at,
  }));
}

export interface FeedJob extends JobListItem, RichJobFields {
  description: string | null;
}

export async function getFeedJob(id: UUID): Promise<FeedJob | null> {
  const { data: r } = await supabase
    .from('open_jobs_feed')
    .select(
      'id, title, trade_category, description, postcode, city, budget_min_pence, budget_max_pence, budget_note, photos, timing, property_type, preferred_start_date, access_notes, bid_count, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    trade_category: r.trade_category,
    description: r.description,
    postcode: r.postcode,
    city: r.city,
    budget_min_pence: num(r.budget_min_pence),
    budget_max_pence: num(r.budget_max_pence),
    budget_note: r.budget_note,
    photos: (r.photos as string[] | null) ?? [],
    timing: r.timing ?? null,
    property_type: r.property_type ?? null,
    preferred_start_date: r.preferred_start_date ?? null,
    access_notes: r.access_notes ?? null,
    bid_count: Number(r.bid_count ?? 0),
    created_at: r.created_at,
  };
}

export interface CreateJobRequestInput {
  customer_id: UUID;
  trade_category: string;
  title: string;
  description?: string | null;
  city?: string | null;
  postcode: string;
  budget_min_pence?: number | null;
  budget_max_pence?: number | null;
  budget_note?: string | null;
  photos?: string[];
  timing?: string | null;
  property_type?: string | null;
  preferred_start_date?: string | null;
  access_notes?: string | null;
}

export async function createJobRequest(input: CreateJobRequestInput): Promise<UUID> {
  const { data, error } = await supabase
    .from('job_requests')
    .insert({
      customer_id: input.customer_id,
      trade_category: input.trade_category,
      title: input.title,
      description: input.description ?? null,
      city: input.city ?? null,
      postcode: input.postcode.toUpperCase(),
      budget_min_pence: input.budget_min_pence ?? null,
      budget_max_pence: input.budget_max_pence ?? null,
      budget_note: input.budget_note ?? null,
      photos: input.photos ?? [],
      timing: input.timing ?? null,
      property_type: input.property_type ?? null,
      preferred_start_date: input.preferred_start_date || null,
      access_notes: input.access_notes ?? null,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not post job.');
  return data.id;
}

export interface MyRequestItem {
  id: UUID;
  title: string;
  trade_category: string;
  status: JobRequestStatus;
  budget_min_pence: number | null;
  budget_max_pence: number | null;
  budget_note: string | null;
  quote_count: number;
}

export async function listMyRequests(customerId: UUID): Promise<MyRequestItem[]> {
  // NOTE: deliberately NOT using an embedded `bids(count)` select — that
  // embed was returning an empty result set under RLS, which silently
  // emptied "My jobs" and broke the browse-feed own-job filter. Two plain
  // queries are robust and fast at this scale.
  const { data, error } = await supabase
    .from('job_requests')
    .select(
      'id, title, trade_category, status, budget_min_pence, budget_max_pence, budget_note',
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const ids = data.map((r) => r.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: bidRows } = await supabase
      .from('bids')
      .select('job_request_id')
      .in('job_request_id', ids)
      .neq('status', 'withdrawn');
    (bidRows ?? []).forEach((b) => {
      const k = b.job_request_id as string;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
  }

  return data.map((r) => ({
    id: r.id,
    title: r.title,
    trade_category: r.trade_category,
    status: r.status,
    budget_min_pence: num(r.budget_min_pence),
    budget_max_pence: num(r.budget_max_pence),
    budget_note: r.budget_note,
    quote_count: counts.get(r.id) ?? 0,
  }));
}

/**
 * Delete a job the customer posted. Allowed by the job_requests_delete RLS
 * policy (customer_id = auth.uid()); bids and threads cascade. Only offer
 * this while the job is still open — once matched it's a live project.
 */
export async function deleteJobRequest(jobId: UUID): Promise<void> {
  const { error } = await supabase.from('job_requests').delete().eq('id', jobId);
  if (error) throw new Error(error.message);
}

export interface RequestBid {
  id: UUID;
  tenant_id: UUID;
  trade_name: string;
  trade_phone: string | null;
  rating_avg: number | null;
  rating_count: number;
  amount_pence: number | null;
  message: string | null;
  available_from: string | null;
  duration_estimate: string | null;
  warranty: string | null;
  about: string | null;
  status: BidStatus;
  estimate_id: UUID | null;
  created_at: string;
}

export interface MyRequestDetail {
  id: UUID;
  title: string;
  trade_category: string;
  description: string | null;
  status: JobRequestStatus;
  matched_project_id: UUID | null;
  budget_min_pence: number | null;
  budget_max_pence: number | null;
  budget_note: string | null;
  bids: RequestBid[];
}

export async function getMyRequestWithBids(
  id: UUID,
  customerId: UUID,
): Promise<MyRequestDetail | null> {
  const { data: job } = await supabase
    .from('job_requests')
    .select(
      'id, title, trade_category, description, status, matched_project_id, budget_min_pence, budget_max_pence, budget_note',
    )
    .eq('id', id)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (!job) return null;

  const { data: bidsRaw } = await supabase
    .from('bids')
    .select('id, tenant_id, amount_pence, message, available_from, duration_estimate, warranty, about, status, estimate_id, created_at')
    .eq('job_request_id', id)
    .order('created_at', { ascending: true });
  const bids = (bidsRaw ?? []).filter((b) => b.status !== 'withdrawn');

  const tenantIds = Array.from(new Set(bids.map((b) => b.tenant_id)));
  const nameMap = new Map<string, string>();
  const phoneMap = new Map<string, string | null>();
  const ownerByTenant = new Map<string, string>();
  if (tenantIds.length) {
    const { data: trades } = await supabase
      .from('trades_public')
      .select('id, name, business_phone, owner_user_id')
      .in('id', tenantIds);
    (trades ?? []).forEach((t) => {
      nameMap.set(t.id as string, t.name as string);
      phoneMap.set(t.id as string, (t.business_phone as string | null) ?? null);
      if (t.owner_user_id) ownerByTenant.set(t.id as string, t.owner_user_id as string);
    });
  }

  // Trade ratings (customer_to_trade reviews), averaged per trade owner.
  const ratingByTenant = new Map<string, { avg: number; count: number }>();
  const ownerIds = [...new Set(ownerByTenant.values())];
  if (ownerIds.length) {
    const { data: revs } = await supabase
      .from('marketplace_reviews')
      .select('reviewee_id, rating')
      .eq('direction', 'customer_to_trade')
      .in('reviewee_id', ownerIds);
    const byOwner = new Map<string, number[]>();
    (revs ?? []).forEach((r) => {
      const arr = byOwner.get(r.reviewee_id as string) ?? [];
      arr.push(r.rating as number);
      byOwner.set(r.reviewee_id as string, arr);
    });
    ownerByTenant.forEach((owner, tenantId) => {
      const arr = byOwner.get(owner);
      if (arr?.length) {
        ratingByTenant.set(tenantId, {
          avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10,
          count: arr.length,
        });
      }
    });
  }

  return {
    id: job.id,
    title: job.title,
    trade_category: job.trade_category,
    description: job.description,
    status: job.status,
    matched_project_id: job.matched_project_id,
    budget_min_pence: num(job.budget_min_pence),
    budget_max_pence: num(job.budget_max_pence),
    budget_note: job.budget_note,
    bids: bids.map((b) => ({
      id: b.id,
      tenant_id: b.tenant_id,
      trade_name: nameMap.get(b.tenant_id) ?? 'A trade',
      trade_phone: phoneMap.get(b.tenant_id) ?? null,
      rating_avg: ratingByTenant.get(b.tenant_id)?.avg ?? null,
      rating_count: ratingByTenant.get(b.tenant_id)?.count ?? 0,
      amount_pence: num(b.amount_pence),
      message: b.message,
      available_from: b.available_from ?? null,
      duration_estimate: b.duration_estimate ?? null,
      warranty: b.warranty ?? null,
      about: b.about ?? null,
      status: b.status,
      estimate_id: b.estimate_id ?? null,
      created_at: b.created_at,
    })),
  };
}

export interface QuoteLine {
  description: string;
  quantity: number;
  unit: string;
  line_price_pence: number;
}
export interface CustomerQuote {
  id: UUID;
  number: string;
  title: string;
  status: string;
  subtotal_pence: number;
  vat_pence: number;
  total_pence: number;
  vat_mode: string;
  notes: string | null;
  terms: string | null;
  valid_until: string | null;
  lines: QuoteLine[];
}

/** Read-only full quote for the customer (estimate + line items), via the
 *  estimate_customer RLS policies. */
export async function getCustomerQuote(estimateId: UUID): Promise<CustomerQuote | null> {
  const { data: e } = await supabase
    .from('estimates')
    .select('id, number, title, status, subtotal_pence, vat_pence, total_pence, vat_mode, notes, terms, valid_until')
    .eq('id', estimateId)
    .maybeSingle();
  if (!e) return null;
  const { data: lines } = await supabase
    .from('estimate_line_items')
    .select('description, quantity, unit, line_price_pence, position')
    .eq('estimate_id', estimateId)
    .order('position', { ascending: true });
  return {
    id: e.id,
    number: e.number,
    title: e.title,
    status: e.status,
    subtotal_pence: Number(e.subtotal_pence ?? 0),
    vat_pence: Number(e.vat_pence ?? 0),
    total_pence: Number(e.total_pence ?? 0),
    vat_mode: e.vat_mode,
    notes: e.notes,
    terms: e.terms,
    valid_until: e.valid_until,
    lines: (lines ?? []).map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      line_price_pence: Number(l.line_price_pence ?? 0),
    })),
  };
}

export async function declineBid(bidId: UUID): Promise<void> {
  const { error } = await supabase.from('bids').update({ status: 'declined' }).eq('id', bidId);
  if (error) throw new Error(error.message);
}

export async function acceptBid(bidId: UUID): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  const res = await fetch(`${WEB_URL}/api/marketplace/accept-bid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ bid_id: bidId }),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) throw new Error(json.error ?? 'Could not accept the bid.');
}

export async function openThreadFromBid(params: {
  bid_id: UUID;
  customer_id: UUID;
}): Promise<UUID> {
  const { data: bid } = await supabase
    .from('bids')
    .select('job_request_id, tenant_id')
    .eq('id', params.bid_id)
    .maybeSingle();
  if (!bid) throw new Error('Bid not found.');
  const { data: existing } = await supabase
    .from('marketplace_threads')
    .select('id')
    .eq('job_request_id', bid.job_request_id)
    .eq('tenant_id', bid.tenant_id)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase
    .from('marketplace_threads')
    .insert({
      job_request_id: bid.job_request_id,
      customer_id: params.customer_id,
      tenant_id: bid.tenant_id,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not start the conversation.');
  return data.id;
}

export async function listCustomerThreads(customerId: UUID): Promise<ThreadListItem[]> {
  const { data: threads } = await supabase
    .from('marketplace_threads')
    .select('id, job_request_id, tenant_id, last_message_at')
    .eq('customer_id', customerId)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  const rows = threads ?? [];
  if (rows.length === 0) return [];
  const tenantIds = Array.from(new Set(rows.map((t) => t.tenant_id)));
  const { data: trades } = await supabase.from('trades_public').select('id, name').in('id', tenantIds);
  const nameMap = new Map((trades ?? []).map((t) => [t.id as string, t.name as string]));
  return rows.map((t) => ({
    id: t.id,
    job_request_id: t.job_request_id,
    last_message_at: t.last_message_at,
    title: nameMap.get(t.tenant_id) ?? 'A trade',
  }));
}

/**
 * Open (or find) the conversation with the builder for a matched project.
 * Resolves the job behind the project via matched_project_id, then reuses
 * the bid-thread the pair already have. Returns null if none can be resolved.
 */
export async function openProjectThread(
  projectId: UUID,
  customerId: UUID,
): Promise<UUID | null> {
  const { data: job } = await supabase
    .from('job_requests')
    .select('matched_bid_id')
    .eq('matched_project_id', projectId)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (!job?.matched_bid_id) return null;
  return openThreadFromBid({ bid_id: job.matched_bid_id, customer_id: customerId });
}

/** Mark a marketplace (bidding) thread's incoming messages as read. */
export async function markMarketplaceThreadRead(
  threadId: UUID,
  readerId: UUID,
): Promise<void> {
  await supabase
    .from('marketplace_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .neq('sender_id', readerId)
    .is('read_at', null);
}

export interface CustomerConversation {
  key: string;
  kind: 'project' | 'thread';
  routeId: string; // projectId (project chat) or threadId (bidding thread)
  title: string;
  subtitle: string;
  last_at: string | null;
  unread: number;
}

/**
 * One unified inbox for the customer: a conversation per hired project (the
 * single post-hire conversation, on `messages`) plus any pre-hire bidding
 * threads for jobs not yet matched. Each carries an unread count.
 */
export async function listCustomerConversations(
  customerId: UUID,
): Promise<CustomerConversation[]> {
  const convos: CustomerConversation[] = [];

  // --- Project conversations (hired work) ---
  const projects = await listCustomerProjects(customerId);
  if (projects.length) {
    const pids = projects.map((p) => p.id);
    const { data: msgs } = await supabase
      .from('messages')
      .select('project_id, sender_id, body, sent_at, read_at')
      .in('project_id', pids)
      .order('sent_at', { ascending: false });
    const lastByP = new Map<string, string>();
    const unreadByP = new Map<string, number>();
    (msgs ?? []).forEach((m) => {
      const pid = m.project_id as string;
      if (!lastByP.has(pid)) lastByP.set(pid, m.sent_at as string);
      if (!m.read_at && m.sender_id !== customerId) {
        unreadByP.set(pid, (unreadByP.get(pid) ?? 0) + 1);
      }
    });
    projects.forEach((p) =>
      convos.push({
        key: `p-${p.id}`,
        kind: 'project',
        routeId: p.id,
        title: p.trade_name,
        subtitle: p.name,
        last_at: lastByP.get(p.id) ?? null,
        unread: unreadByP.get(p.id) ?? 0,
      }),
    );
  }

  // --- Pre-hire bidding threads (jobs not yet matched) ---
  const threads = await listCustomerThreads(customerId);
  if (threads.length) {
    const jobIds = [...new Set(threads.map((t) => t.job_request_id))];
    const { data: jobs } = await supabase
      .from('job_requests')
      .select('id, status, title')
      .in('id', jobIds);
    const statusById = new Map((jobs ?? []).map((j) => [j.id as string, j.status as string]));
    const jobTitleById = new Map((jobs ?? []).map((j) => [j.id as string, j.title as string]));
    const tids = threads.map((t) => t.id);
    const { data: tmsgs } = await supabase
      .from('marketplace_messages')
      .select('thread_id, sender_id, read_at')
      .in('thread_id', tids);
    const unreadByT = new Map<string, number>();
    (tmsgs ?? []).forEach((m) => {
      if (!m.read_at && m.sender_id !== customerId) {
        const tid = m.thread_id as string;
        unreadByT.set(tid, (unreadByT.get(tid) ?? 0) + 1);
      }
    });
    threads.forEach((t) => {
      if (statusById.get(t.job_request_id) === 'matched') return; // superseded by project convo
      convos.push({
        key: `t-${t.id}`,
        kind: 'thread',
        routeId: t.id,
        title: t.title,
        subtitle: jobTitleById.get(t.job_request_id) ?? 'Your job',
        last_at: t.last_message_at,
        unread: unreadByT.get(t.id) ?? 0,
      });
    });
  }

  convos.sort((a, b) => (b.last_at ?? '').localeCompare(a.last_at ?? ''));
  return convos;
}

export async function countCustomerUnread(customerId: UUID): Promise<number> {
  const convos = await listCustomerConversations(customerId);
  return convos.reduce((s, c) => s + c.unread, 0);
}

// ===========================================================================
// CUSTOMER PROJECT PORTAL — follow the build, approve changes, pay
// ===========================================================================

export interface ProjectHeader {
  id: UUID;
  name: string;
  status: string;
  progress_percent: number;
  estimated_end_date: string;
  tenant_id: UUID;
  pm_id: UUID;
  trade_name: string;
  handover_pdf_storage_path: string | null;
}

export async function getCustomerProject(projectId: UUID): Promise<ProjectHeader | null> {
  const { data: p } = await supabase
    .from('projects')
    .select('id, name, status, progress_percent, estimated_end_date, tenant_id, pm_id, handover_pdf_storage_path')
    .eq('id', projectId)
    .maybeSingle();
  if (!p) return null;
  const { data: trade } = await supabase
    .from('trades_public')
    .select('name')
    .eq('id', p.tenant_id)
    .maybeSingle();
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    progress_percent: Number(p.progress_percent),
    estimated_end_date: p.estimated_end_date,
    tenant_id: p.tenant_id,
    pm_id: p.pm_id,
    trade_name: (trade?.name as string) ?? 'Your trade',
    handover_pdf_storage_path: (p.handover_pdf_storage_path as string | null) ?? null,
  };
}

/** Signed URL for the handover PDF (private bucket; client allowed via RLS). */
export async function getHandoverUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('handovers').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export interface CustomerProjectListItem {
  id: UUID;
  name: string;
  status: string;
  progress_percent: number;
  trade_name: string;
}

/**
 * All projects where this user is the client — i.e. jobs they posted and
 * then hired a builder for. Keyed to client_id (not a tenant), so it spans
 * every builder the customer has hired. Access is granted by the
 * projects_client_read RLS policy.
 */
export async function listCustomerProjects(
  customerId: UUID,
): Promise<CustomerProjectListItem[]> {
  const { data } = await supabase
    .from('projects')
    .select('id, name, status, progress_percent, tenant_id, updated_at')
    .eq('client_id', customerId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const tenantIds = Array.from(new Set(rows.map((p) => p.tenant_id)));
  const { data: trades } = await supabase
    .from('trades_public')
    .select('id, name')
    .in('id', tenantIds);
  const nameMap = new Map((trades ?? []).map((t) => [t.id as string, t.name as string]));
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    progress_percent: Number(p.progress_percent),
    trade_name: nameMap.get(p.tenant_id) ?? 'Your builder',
  }));
}

export interface Stage {
  id: UUID;
  name: string;
  status: string;
}
export async function listProjectStages(projectId: UUID): Promise<Stage[]> {
  const { data } = await supabase
    .from('project_stages')
    .select('id, name, status, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true });
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, status: s.status }));
}

export interface Update {
  id: UUID;
  headline: string | null;
  body: string;
  posted_at: string;
  photos: string[];
}
export async function listProjectUpdates(projectId: UUID): Promise<Update[]> {
  const { data } = await supabase
    .from('project_updates')
    .select('id, headline, body, posted_at')
    .eq('project_id', projectId)
    .order('posted_at', { ascending: false })
    .limit(8);
  const updates = (data ?? []) as Omit<Update, 'photos'>[];
  if (updates.length === 0) return [];

  // Attach photos (signed URLs from the private update-photos bucket). The
  // client can read these via the update_photos_read storage policy.
  const ids = updates.map((u) => u.id);
  const { data: photoRows } = await supabase
    .from('update_photos')
    .select('update_id, storage_path, position')
    .in('update_id', ids)
    .order('position', { ascending: true });
  const byUpdate = new Map<string, string[]>();
  const paths = (photoRows ?? []).map((r) => r.storage_path as string);
  let signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage
      .from('update-photos')
      .createSignedUrls(paths, 3600);
    signed = new Map(
      (urls ?? [])
        .filter((u) => u.signedUrl)
        .map((u) => [u.path as string, u.signedUrl as string]),
    );
  }
  (photoRows ?? []).forEach((r) => {
    const url = signed.get(r.storage_path as string);
    if (!url) return;
    const arr = byUpdate.get(r.update_id as string) ?? [];
    arr.push(url);
    byUpdate.set(r.update_id as string, arr);
  });

  return updates.map((u) => ({ ...u, photos: byUpdate.get(u.id) ?? [] }));
}

export interface Invoice {
  id: UUID;
  number: string;
  title: string;
  amount_gbp_pence: number;
  status: string;
  due_at: string;
  cash_requested_at: string | null;
}
export async function listProjectInvoices(projectId: UUID): Promise<Invoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('id, number, title, amount_gbp_pence, status, due_at, cash_requested_at')
    .eq('project_id', projectId)
    .order('issued_at', { ascending: false });
  return (data ?? []).map((i) => ({
    id: i.id,
    number: i.number,
    title: i.title,
    amount_gbp_pence: Number(i.amount_gbp_pence),
    status: i.status,
    due_at: i.due_at,
    cash_requested_at: (i.cash_requested_at as string | null) ?? null,
  }));
}

/** Customer flags that they intend to pay this invoice in cash; the builder
 *  then confirms receipt. Builder-confirms model keeps 'paid' trustworthy. */
export async function requestCashPayment(invoiceId: UUID): Promise<void> {
  const { error } = await supabase.rpc('request_cash_payment', { p_invoice: invoiceId });
  if (error) throw new Error(error.message);
}

export interface OpenDecision {
  id: UUID;
  title: string;
  description: string | null;
  deadline: string | null;
  options: { id: UUID; label: string; price_gbp_pence: number | null }[];
}
export async function listOpenDecisions(projectId: UUID): Promise<OpenDecision[]> {
  const { data: decisions } = await supabase
    .from('decisions')
    .select('id, title, description, deadline')
    .eq('project_id', projectId)
    .eq('status', 'open');
  const rows = decisions ?? [];
  if (rows.length === 0) return [];
  const { data: opts } = await supabase
    .from('decision_options')
    .select('id, decision_id, label, price_gbp_pence, position')
    .in('decision_id', rows.map((d) => d.id))
    .order('position', { ascending: true });
  const byDecision = new Map<string, { id: UUID; label: string; price_gbp_pence: number | null }[]>();
  (opts ?? []).forEach((o) => {
    const arr = byDecision.get(o.decision_id) ?? [];
    arr.push({ id: o.id, label: o.label, price_gbp_pence: num(o.price_gbp_pence) });
    byDecision.set(o.decision_id, arr);
  });
  return rows.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    deadline: d.deadline,
    options: byDecision.get(d.id) ?? [],
  }));
}

export interface ProposedVariation {
  id: UUID;
  number: string;
  title: string;
  description: string | null;
  delta_amount_gbp_pence: number;
  delta_days: number;
}
export async function listProposedVariations(projectId: UUID): Promise<ProposedVariation[]> {
  const { data } = await supabase
    .from('variations')
    .select('id, number, title, description, delta_amount_gbp_pence, delta_days')
    .eq('project_id', projectId)
    .eq('status', 'proposed');
  return (data ?? []).map((v) => ({
    id: v.id,
    number: v.number,
    title: v.title,
    description: v.description,
    delta_amount_gbp_pence: Number(v.delta_amount_gbp_pence),
    delta_days: Number(v.delta_days),
  }));
}

export async function decideDecision(
  decisionId: UUID,
  optionId: UUID,
  userId: UUID,
): Promise<void> {
  const { error } = await supabase
    .from('decisions')
    .update({
      selected_option_id: optionId,
      status: 'accepted',
      decided_at: new Date().toISOString(),
      decided_by: userId,
    })
    .eq('id', decisionId);
  if (error) throw new Error(error.message);
}

export async function signVariation(
  variationId: UUID,
  signature: string,
  userId: UUID,
): Promise<void> {
  if (!signature.trim()) throw new Error('Type your name to sign.');
  const { error } = await supabase
    .from('variations')
    .update({
      status: 'accepted',
      decided_at: new Date().toISOString(),
      decided_by: userId,
      client_signature: signature.trim(),
    })
    .eq('id', variationId);
  if (error) throw new Error(error.message);
}

export async function payInvoice(invoiceId: UUID): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  const res = await fetch(`${WEB_URL}/api/marketplace/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Could not start payment.');
  return json.url;
}

export async function submitCustomerReview(params: {
  project_id: UUID;
  reviewee_id: UUID;
  tenant_id: UUID;
  reviewer_id: UUID;
  rating: number;
  body?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('marketplace_reviews').insert({
    project_id: params.project_id,
    tenant_id: params.tenant_id,
    reviewer_id: params.reviewer_id,
    reviewee_id: params.reviewee_id,
    direction: 'customer_to_trade',
    rating: params.rating,
    body: params.body ?? null,
  });
  if (error) {
    if (error.code === '23505') throw new Error('You have already reviewed this job.');
    throw new Error(error.message);
  }
}
