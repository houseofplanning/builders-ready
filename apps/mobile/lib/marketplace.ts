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
  created_at: string;
}

export interface JobDetail extends JobListItem {
  customer_id: UUID;
  description: string | null;
  status: JobRequestStatus;
}

export interface BidRow {
  id: UUID;
  amount_pence: number | null;
  message: string | null;
  status: BidStatus;
}

function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

export async function listOpenJobRequests(opts: {
  category?: string;
  area?: string;
}): Promise<JobListItem[]> {
  let q = supabase
    .from('job_requests')
    .select(
      'id, title, trade_category, postcode, city, budget_min_pence, budget_max_pence, budget_note, created_at',
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(60);
  if (opts.category) q = q.eq('trade_category', opts.category);
  if (opts.area && opts.area.trim()) q = q.ilike('postcode', `${opts.area.trim().toUpperCase()}%`);
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
    created_at: r.created_at,
  }));
}

export async function getJobRequest(id: UUID): Promise<JobDetail | null> {
  const { data: r } = await supabase
    .from('job_requests')
    .select(
      'id, customer_id, title, trade_category, description, postcode, city, budget_min_pence, budget_max_pence, budget_note, status, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!r) return null;
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
    status: r.status,
    created_at: r.created_at,
  };
}

export async function getMyBid(jobId: UUID, tenantId: UUID): Promise<BidRow | null> {
  const { data } = await supabase
    .from('bids')
    .select('id, amount_pence, message, status')
    .eq('job_request_id', jobId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    amount_pence: num(data.amount_pence),
    message: data.message,
    status: data.status,
  };
}

export async function submitBid(params: {
  job_request_id: UUID;
  tenant_id: UUID;
  created_by: UUID;
  amount_pence?: number | null;
  message?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('bids').insert({
    job_request_id: params.job_request_id,
    tenant_id: params.tenant_id,
    created_by: params.created_by,
    amount_pence: params.amount_pence ?? null,
    message: params.message ?? null,
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
  created_at: string;
}

export async function getThreadMessages(threadId: UUID): Promise<ThreadMessageRow[]> {
  const { data } = await supabase
    .from('marketplace_messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  return (data ?? []) as ThreadMessageRow[];
}

export async function sendMarketplaceMessage(params: {
  thread_id: UUID;
  sender_id: UUID;
  body: string;
}): Promise<void> {
  const body = params.body.trim();
  if (!body) throw new Error('Message is empty.');
  const { error } = await supabase.from('marketplace_messages').insert({
    thread_id: params.thread_id,
    sender_id: params.sender_id,
    body,
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
  area?: string;
}): Promise<JobListItem[]> {
  let q = supabase
    .from('open_jobs_feed')
    .select(
      'id, title, trade_category, postcode, city, budget_min_pence, budget_max_pence, budget_note, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(60);
  if (opts.category) q = q.eq('trade_category', opts.category);
  if (opts.area && opts.area.trim()) q = q.ilike('postcode', `${opts.area.trim().toUpperCase()}%`);
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
    created_at: r.created_at,
  }));
}

export interface FeedJob extends JobListItem {
  description: string | null;
}

export async function getFeedJob(id: UUID): Promise<FeedJob | null> {
  const { data: r } = await supabase
    .from('open_jobs_feed')
    .select(
      'id, title, trade_category, description, postcode, city, budget_min_pence, budget_max_pence, budget_note, created_at',
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
  const { data } = await supabase
    .from('job_requests')
    .select(
      'id, title, trade_category, status, budget_min_pence, budget_max_pence, budget_note, bids(count)',
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r) => {
    const bidsRel = r.bids as { count: number }[] | null;
    return {
      id: r.id,
      title: r.title,
      trade_category: r.trade_category,
      status: r.status,
      budget_min_pence: num(r.budget_min_pence),
      budget_max_pence: num(r.budget_max_pence),
      budget_note: r.budget_note,
      quote_count: bidsRel?.[0]?.count ?? 0,
    };
  });
}

export interface RequestBid {
  id: UUID;
  tenant_id: UUID;
  trade_name: string;
  amount_pence: number | null;
  message: string | null;
  status: BidStatus;
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
    .select('id, tenant_id, amount_pence, message, status, created_at')
    .eq('job_request_id', id)
    .order('created_at', { ascending: true });
  const bids = (bidsRaw ?? []).filter((b) => b.status !== 'withdrawn');

  const tenantIds = Array.from(new Set(bids.map((b) => b.tenant_id)));
  const nameMap = new Map<string, string>();
  if (tenantIds.length) {
    const { data: trades } = await supabase
      .from('trades_public')
      .select('id, name')
      .in('id', tenantIds);
    (trades ?? []).forEach((t) => nameMap.set(t.id as string, t.name as string));
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
      amount_pence: num(b.amount_pence),
      message: b.message,
      status: b.status,
      created_at: b.created_at,
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
}

export async function getCustomerProject(projectId: UUID): Promise<ProjectHeader | null> {
  const { data: p } = await supabase
    .from('projects')
    .select('id, name, status, progress_percent, estimated_end_date, tenant_id, pm_id')
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
  };
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
}
export async function listProjectUpdates(projectId: UUID): Promise<Update[]> {
  const { data } = await supabase
    .from('project_updates')
    .select('id, headline, body, posted_at')
    .eq('project_id', projectId)
    .order('posted_at', { ascending: false })
    .limit(8);
  return (data ?? []) as Update[];
}

export interface Invoice {
  id: UUID;
  number: string;
  title: string;
  amount_gbp_pence: number;
  status: string;
  due_at: string;
}
export async function listProjectInvoices(projectId: UUID): Promise<Invoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('id, number, title, amount_gbp_pence, status, due_at')
    .eq('project_id', projectId)
    .order('issued_at', { ascending: false });
  return (data ?? []).map((i) => ({
    id: i.id,
    number: i.number,
    title: i.title,
    amount_gbp_pence: Number(i.amount_gbp_pence),
    status: i.status,
    due_at: i.due_at,
  }));
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
