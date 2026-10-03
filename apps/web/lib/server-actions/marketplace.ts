'use server';

import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  jobRequestCreate,
  bidCreate,
  messageCreate,
  reviewCreate,
  distributeStages,
  stagesForTemplate,
} from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { getSupabaseAdmin } from '../supabase-admin';
import { requireCustomer } from '../customer-resolver';
import { resolveCurrentTenant } from '../tenant-resolver';
import { createCheckoutForInvoice } from '../checkout';
import { appUrl } from '../stripe';

export interface MarketplaceResult {
  ok: boolean;
  error?: string;
  id?: string;
  redirectTo?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// createCustomerAccount — consumer signup. Creates an auth user with NO tenant
// membership (that's what makes them a "customer"), then signs them in.
// ---------------------------------------------------------------------------
const customerSignup = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .email()
    .max(255)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function createCustomerAccount(
  raw: Record<string, unknown>,
): Promise<MarketplaceResult> {
  const parsed = customerSignup.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Check your name, email and password (8+ characters).' };
  }
  const { full_name, email, password } = parsed.data;

  const admin = getSupabaseAdmin();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createErr || !created.user) {
    if (createErr?.message?.toLowerCase().includes('already')) {
      return { ok: false, error: 'An account with that email already exists. Sign in instead.' };
    }
    return { ok: false, error: createErr?.message ?? 'Could not create account.' };
  }

  // No tenant_members row — this user is a customer, not a trade.
  const supabase = await createSupabaseServer();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) return { ok: false, error: signInErr.message };

  return { ok: true, redirectTo: '/me' };
}

// ---------------------------------------------------------------------------
// createJobRequest — a customer posts a job. RLS enforces customer_id = me.
// ---------------------------------------------------------------------------
export async function createJobRequest(
  raw: Record<string, unknown>,
): Promise<MarketplaceResult> {
  const me = await requireCustomer();
  const parsed = jobRequestCreate.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const d = parsed.data;

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('job_requests')
    .insert({
      customer_id: me.user_id,
      trade_category: d.trade_category,
      title: d.title,
      description: d.description ?? null,
      address_line1: d.address_line1 ?? null,
      city: d.city ?? null,
      postcode: d.postcode,
      budget_min_pence: d.budget_min_pence ?? null,
      budget_max_pence: d.budget_max_pence ?? null,
      budget_note: d.budget_note ?? null,
      photos: d.photos ?? [],
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath('/me');
  return { ok: true, id: data.id, redirectTo: '/me' };
}

// ---------------------------------------------------------------------------
// closeJobRequest — customer closes one of their own requests.
// ---------------------------------------------------------------------------
export async function closeJobRequest(id: string): Promise<MarketplaceResult> {
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('job_requests')
    .update({ status: 'closed' })
    .eq('id', id)
    .eq('customer_id', me.user_id)
    .is('matched_project_id', null);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/me');
  return { ok: true };
}

// ===========================================================================
// TRADE SIDE — bidding
// ===========================================================================

// submitBid — a trade bids/quotes on an open job. RLS enforces an active
// subscription (is_tenant_active) + the job being open + one bid per trade.
export async function submitBid(raw: Record<string, unknown>): Promise<MarketplaceResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can bid on jobs.' };
  }
  const parsed = bidCreate.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const d = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('bids').insert({
    job_request_id: d.job_request_id,
    tenant_id: tenant.tenant.id,
    created_by: tenant.user_id,
    amount_pence: d.amount_pence ?? null,
    message: d.message ?? null,
    estimate_id: d.estimate_id ?? null,
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'You have already bid on this job.' };
    if (error.message.toLowerCase().includes('row-level security')) {
      return {
        ok: false,
        error: 'Your subscription needs to be active to bid on jobs, and the job must still be open.',
      };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath(`/${tenant.tenant.slug}/find-work`);
  revalidatePath(`/${tenant.tenant.slug}/find-work/${d.job_request_id}`);
  return { ok: true };
}

// withdrawBid — a trade pulls its own bid.
export async function withdrawBid(bidId: string): Promise<MarketplaceResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('bids')
    .update({ status: 'withdrawn' })
    .eq('id', bidId)
    .eq('tenant_id', tenant.tenant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/find-work`);
  return { ok: true };
}

// ===========================================================================
// CUSTOMER SIDE — decide on bids
// ===========================================================================

// declineBid — customer declines a single bid on their own request.
export async function declineBid(bidId: string): Promise<MarketplaceResult> {
  await requireCustomer();
  const supabase = await createSupabaseServer();
  // RLS (bids_update_customer) restricts this to bids on the caller's own jobs.
  const { error } = await supabase.from('bids').update({ status: 'declined' }).eq('id', bidId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/me');
  return { ok: true };
}

// acceptBid — customer accepts a bid. Runs with the service role to create a
// project under the winning trade's tenant (the customer can't write there via
// RLS), then marks the request matched and declines the other bids. From this
// point the job flows through the existing project lifecycle.
export async function acceptBid(bidId: string): Promise<MarketplaceResult> {
  const me = await requireCustomer();
  const admin = getSupabaseAdmin();

  const { data: bid } = await admin
    .from('bids')
    .select('id, job_request_id, tenant_id, amount_pence, status')
    .eq('id', bidId)
    .maybeSingle();
  if (!bid) return { ok: false, error: 'Bid not found.' };

  const { data: job } = await admin
    .from('job_requests')
    .select('id, customer_id, title, address_line1, city, postcode, status')
    .eq('id', bid.job_request_id)
    .maybeSingle();
  if (!job || job.customer_id !== me.user_id) return { ok: false, error: 'This is not your request.' };
  if (job.status !== 'open') return { ok: false, error: 'This request is no longer open.' };

  const { data: trade } = await admin
    .from('tenants')
    .select('owner_user_id')
    .eq('id', bid.tenant_id)
    .maybeSingle();
  if (!trade) return { ok: false, error: 'Trade not found.' };

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
      client_id: me.user_id,
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
      return {
        ok: false,
        error: 'This trade has reached their plan limit — ask them to free up a slot and try again.',
      };
    }
    return { ok: false, error: projErr.message };
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
  if (stageRows.length > 0) {
    await admin.from('project_stages').insert(stageRows);
  }

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

  revalidatePath('/me');
  revalidatePath(`/me/requests/${job.id}`);
  return { ok: true, id: project.id };
}

// ===========================================================================
// MESSAGING — one thread per (job_request, trade)
// ===========================================================================

// openThreadForJob — trade starts (or reopens) a thread with the customer.
export async function openThreadForJob(jobRequestId: string): Promise<MarketplaceResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can message.' };
  }
  const supabase = await createSupabaseServer();
  const { data: job } = await supabase
    .from('job_requests')
    .select('customer_id')
    .eq('id', jobRequestId)
    .maybeSingle();
  if (!job) return { ok: false, error: 'Job not found.' };

  const { data: existing } = await supabase
    .from('marketplace_threads')
    .select('id')
    .eq('job_request_id', jobRequestId)
    .eq('tenant_id', tenant.tenant.id)
    .maybeSingle();
  let threadId = existing?.id as string | undefined;
  if (!threadId) {
    const { data: created, error } = await supabase
      .from('marketplace_threads')
      .insert({
        job_request_id: jobRequestId,
        customer_id: job.customer_id,
        tenant_id: tenant.tenant.id,
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    threadId = created.id;
  }
  return { ok: true, id: threadId, redirectTo: `/${tenant.tenant.slug}/messages/${threadId}` };
}

// openThreadFromBid — customer starts (or reopens) a thread with a trade.
export async function openThreadFromBid(bidId: string): Promise<MarketplaceResult> {
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();
  const { data: bid } = await supabase
    .from('bids')
    .select('job_request_id, tenant_id')
    .eq('id', bidId)
    .maybeSingle();
  if (!bid) return { ok: false, error: 'Bid not found.' };

  const { data: existing } = await supabase
    .from('marketplace_threads')
    .select('id')
    .eq('job_request_id', bid.job_request_id)
    .eq('tenant_id', bid.tenant_id)
    .maybeSingle();
  let threadId = existing?.id as string | undefined;
  if (!threadId) {
    const { data: created, error } = await supabase
      .from('marketplace_threads')
      .insert({
        job_request_id: bid.job_request_id,
        customer_id: me.user_id,
        tenant_id: bid.tenant_id,
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    threadId = created.id;
  }
  return { ok: true, id: threadId, redirectTo: `/me/messages/${threadId}` };
}

// sendMessage — either party posts to a thread they belong to.
export async function sendMessage(raw: Record<string, unknown>): Promise<MarketplaceResult> {
  const parsed = messageCreate.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Message cannot be empty.' };
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase.from('marketplace_messages').insert({
    thread_id: parsed.data.thread_id,
    sender_id: auth.user.id,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };
  await supabase
    .from('marketplace_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', parsed.data.thread_id);
  return { ok: true };
}

// ===========================================================================
// REVIEWS — two-way, only on a project both parties were part of
// ===========================================================================

export async function submitReview(raw: Record<string, unknown>): Promise<MarketplaceResult> {
  const parsed = reviewCreate.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not signed in.' };

  // The project carries the trade tenant; both client and trade can read it.
  const { data: project } = await supabase
    .from('projects')
    .select('tenant_id')
    .eq('id', parsed.data.project_id)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };

  const { error } = await supabase.from('marketplace_reviews').insert({
    project_id: parsed.data.project_id,
    tenant_id: project.tenant_id,
    reviewer_id: auth.user.id,
    reviewee_id: parsed.data.reviewee_id,
    direction: parsed.data.direction,
    rating: parsed.data.rating,
    body: parsed.data.body ?? null,
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'You have already left this review.' };
    return { ok: false, error: error.message };
  }
  revalidatePath('/me');
  return { ok: true };
}

// ===========================================================================
// CUSTOMER PROJECT PORTAL — act on the live project (decide / sign / pay)
// ===========================================================================

// customerDecideDecision — accept an option on a decision for the customer's
// own project. RLS (decisions_client_decide) gates to the project client.
export async function customerDecideDecision(
  decisionId: string,
  optionId: string,
): Promise<MarketplaceResult> {
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('decisions')
    .update({
      selected_option_id: optionId,
      status: 'accepted',
      decided_at: new Date().toISOString(),
      decided_by: me.user_id,
    })
    .eq('id', decisionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// customerSignVariation — accept + sign a variation on the customer's project.
export async function customerSignVariation(
  variationId: string,
  signature: string,
): Promise<MarketplaceResult> {
  const me = await requireCustomer();
  if (!signature.trim()) return { ok: false, error: 'Please type your name to sign.' };
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('variations')
    .update({
      status: 'accepted',
      decided_at: new Date().toISOString(),
      decided_by: me.user_id,
      client_signature: signature.trim(),
    })
    .eq('id', variationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// payInvoiceAsCustomer — start a Stripe Checkout for an invoice on the
// customer's project. The invoice read is RLS-gated (client has access), so we
// can safely pass its own tenant_id to the shared checkout core.
export async function payInvoiceAsCustomer(invoiceId: string): Promise<MarketplaceResult> {
  await requireCustomer();
  const supabase = await createSupabaseServer();
  const { data: inv } = await supabase
    .from('invoices')
    .select('tenant_id, project_id, status')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) return { ok: false, error: 'Invoice not found.' };

  const result = await createCheckoutForInvoice({
    supabase,
    invoiceId,
    callerTenantId: inv.tenant_id,
    slug: '',
    successUrl: `${appUrl()}/me/jobs/${inv.project_id}?pay=success`,
    cancelUrl: `${appUrl()}/me/jobs/${inv.project_id}?pay=cancelled`,
  });
  if (!result.ok || !result.url) {
    return { ok: false, error: result.error ?? 'Could not start payment.' };
  }
  return { ok: true, url: result.url };
}
