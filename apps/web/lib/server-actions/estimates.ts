'use server';

import { revalidatePath } from 'next/cache';
import {
  estimateCreate,
  computeEstimateTotals,
  distributeStages,
  stagesForTemplate,
  gbp,
  formatDate,
} from '@br/shared';
import type { Estimate, EstimateLineItem } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { getSupabaseAdmin } from '../supabase-admin';
import { resolveCurrentTenant } from '../tenant-resolver';
import { renderEstimatePdfBuffer } from '../pdf/estimate';
import { sendEstimateEmail, sendEstimateAcceptedEmail } from '../email';

function publicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://buildersready.uk';
}

function makeAcceptToken(): string {
  // Two UUIDs concatenated, hyphens stripped — 64 hex chars, unguessable.
  return (
    globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID()
  ).replace(/-/g, '');
}

export interface EstimateActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function nextEstimateNumber(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EST-${year}-`;
  const { data } = await supabase
    .from('estimates')
    .select('number')
    .eq('tenant_id', tenantId)
    .like('number', `${prefix}%`)
    .order('number', { ascending: false })
    .limit(1);
  let nextSeq = 1;
  if (data && data[0]) {
    const match = (data[0].number as string).match(/-(\d+)$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${nextSeq.toString().padStart(3, '0')}`;
}

export async function createEstimateOnWeb(
  raw: Record<string, unknown>,
): Promise<EstimateActionResult> {
  const parsed = estimateCreate.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can create quotes.' };
  }
  const supabase = await createSupabaseServer();
  const d = parsed.data;
  const totals = computeEstimateTotals(d.lines, d.vat_mode, d.vat_rate_bp);

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextEstimateNumber(supabase, tenant.tenant.id);
    const { data: est, error } = await supabase
      .from('estimates')
      .insert({
        tenant_id: tenant.tenant.id,
        created_by: tenant.user_id,
        number,
        title: d.title,
        project_type: d.project_type ?? null,
        client_name: d.client_name,
        client_email: d.client_email ?? null,
        client_phone: d.client_phone ?? null,
        site_address_line1: d.site_address_line1 ?? null,
        site_address_line2: d.site_address_line2 ?? null,
        city: d.city ?? null,
        postcode: d.postcode ?? null,
        status: 'draft',
        vat_mode: d.vat_mode,
        vat_rate_bp: d.vat_rate_bp,
        cost_subtotal_pence: totals.cost_subtotal_pence,
        subtotal_pence: totals.subtotal_pence,
        vat_pence: totals.vat_pence,
        total_pence: totals.total_pence,
        valid_until: d.valid_until ?? null,
        notes: d.notes ?? null,
        terms: d.terms ?? null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') continue; // number collision — retry
      return { ok: false, error: error.message };
    }

    const estimateId = est.id as string;
    if (d.lines.length > 0) {
      const rows = d.lines.map((l, i) => ({
        estimate_id: estimateId,
        tenant_id: tenant.tenant.id,
        saved_rate_id: l.saved_rate_id ?? null,
        position: i,
        kind: l.kind,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_cost_pence: l.unit_cost_pence,
        markup_percent: l.markup_percent,
      }));
      const { error: lineErr } = await supabase
        .from('estimate_line_items')
        .insert(rows);
      if (lineErr) return { ok: false, error: lineErr.message };
    }

    revalidatePath(`/${tenant.tenant.slug}/estimates`);
    return { ok: true, id: estimateId };
  }
  return { ok: false, error: 'Could not pick a unique quote number. Try again.' };
}

export async function updateEstimateOnWeb(
  id: string,
  raw: Record<string, unknown>,
): Promise<EstimateActionResult> {
  const parsed = estimateCreate.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can edit quotes.' };
  }
  const supabase = await createSupabaseServer();
  const d = parsed.data;

  // Only drafts are editable.
  const { data: existing } = await supabase
    .from('estimates')
    .select('tenant_id, status')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Quote not found.' };
  if (existing.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  if (existing.status !== 'draft') {
    return { ok: false, error: 'Only draft quotes can be edited.' };
  }

  const totals = computeEstimateTotals(d.lines, d.vat_mode, d.vat_rate_bp);
  const { error } = await supabase
    .from('estimates')
    .update({
      title: d.title,
      project_type: d.project_type ?? null,
      client_name: d.client_name,
      client_email: d.client_email ?? null,
      client_phone: d.client_phone ?? null,
      site_address_line1: d.site_address_line1 ?? null,
      site_address_line2: d.site_address_line2 ?? null,
      city: d.city ?? null,
      postcode: d.postcode ?? null,
      vat_mode: d.vat_mode,
      vat_rate_bp: d.vat_rate_bp,
      cost_subtotal_pence: totals.cost_subtotal_pence,
      subtotal_pence: totals.subtotal_pence,
      vat_pence: totals.vat_pence,
      total_pence: totals.total_pence,
      valid_until: d.valid_until ?? null,
      notes: d.notes ?? null,
      terms: d.terms ?? null,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  const { error: delErr } = await supabase
    .from('estimate_line_items')
    .delete()
    .eq('estimate_id', id);
  if (delErr) return { ok: false, error: delErr.message };

  if (d.lines.length > 0) {
    const rows = d.lines.map((l, i) => ({
      estimate_id: id,
      tenant_id: tenant.tenant.id,
      saved_rate_id: l.saved_rate_id ?? null,
      position: i,
      kind: l.kind,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_cost_pence: l.unit_cost_pence,
      markup_percent: l.markup_percent,
    }));
    const { error: insErr } = await supabase
      .from('estimate_line_items')
      .insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath(`/${tenant.tenant.slug}/estimates`);
  revalidatePath(`/${tenant.tenant.slug}/estimates/${id}`);
  return { ok: true, id };
}

export async function deleteEstimateOnWeb(
  id: string,
): Promise<EstimateActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can delete quotes.' };
  }
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from('estimates')
    .select('tenant_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Quote not found.' };
  if (existing.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  const { error } = await supabase.from('estimates').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/estimates`);
  return { ok: true };
}

/** Duplicate a quote into a fresh draft (new number, no send/accept state). */
export async function duplicateEstimateOnWeb(
  id: string,
): Promise<EstimateActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can duplicate quotes.' };
  }
  const supabase = await createSupabaseServer();
  const { data: src } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!src) return { ok: false, error: 'Quote not found.' };
  const source = src as Estimate;
  if (source.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  const { data: lineRows } = await supabase
    .from('estimate_line_items')
    .select('*')
    .eq('estimate_id', id)
    .order('position', { ascending: true });
  const lines = (lineRows ?? []) as EstimateLineItem[];

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextEstimateNumber(supabase, tenant.tenant.id);
    const { data: est, error } = await supabase
      .from('estimates')
      .insert({
        tenant_id: tenant.tenant.id,
        created_by: tenant.user_id,
        number,
        title: `${source.title} (copy)`,
        project_type: source.project_type,
        client_name: source.client_name,
        client_email: source.client_email,
        client_phone: source.client_phone,
        site_address_line1: source.site_address_line1,
        site_address_line2: source.site_address_line2,
        city: source.city,
        postcode: source.postcode,
        status: 'draft',
        vat_mode: source.vat_mode,
        vat_rate_bp: source.vat_rate_bp,
        cost_subtotal_pence: source.cost_subtotal_pence,
        subtotal_pence: source.subtotal_pence,
        vat_pence: source.vat_pence,
        total_pence: source.total_pence,
        valid_until: source.valid_until,
        notes: source.notes,
        terms: source.terms,
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') continue;
      return { ok: false, error: error.message };
    }
    const newId = est.id as string;
    if (lines.length > 0) {
      const rows = lines.map((l, i) => ({
        estimate_id: newId,
        tenant_id: tenant.tenant.id,
        saved_rate_id: l.saved_rate_id,
        position: i,
        kind: l.kind,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_cost_pence: l.unit_cost_pence,
        markup_percent: l.markup_percent,
      }));
      const { error: lineErr } = await supabase
        .from('estimate_line_items')
        .insert(rows);
      if (lineErr) return { ok: false, error: lineErr.message };
    }
    revalidatePath(`/${tenant.tenant.slug}/estimates`);
    return { ok: true, id: newId };
  }
  return { ok: false, error: 'Could not pick a unique quote number. Try again.' };
}

export interface SendEstimateResult {
  ok: boolean;
  error?: string;
  token?: string;
  view_url?: string;
  emailed?: boolean;
}

/**
 * Send a quote: render the branded PDF, store it, stamp the estimate as
 * sent (with a shareable accept_token), and email the client if we have an
 * address. Re-sending a 'sent' quote is allowed (regenerates the PDF and
 * re-emails); the token is preserved so existing links keep working.
 */
export async function sendEstimateOnWeb(
  id: string,
): Promise<SendEstimateResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can send quotes.' };
  }
  const admin = getSupabaseAdmin();

  const { data: estRow, error: estErr } = await admin
    .from('estimates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (estErr || !estRow) return { ok: false, error: 'Quote not found.' };
  const estimate = estRow as Estimate;
  if (estimate.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  if (estimate.status === 'accepted') {
    return { ok: false, error: 'This quote has already been accepted.' };
  }

  const { data: lineRows } = await admin
    .from('estimate_line_items')
    .select('*')
    .eq('estimate_id', id)
    .order('position', { ascending: true });
  const lines = (lineRows ?? []) as EstimateLineItem[];

  const token = estimate.accept_token ?? makeAcceptToken();

  // Render + upload the PDF.
  let pdf: Buffer;
  try {
    pdf = await renderEstimatePdfBuffer({
      tenant: {
        name: tenant.tenant.name,
        brand_primary: tenant.tenant.brand_primary,
        business_email: tenant.tenant.business_email,
        business_phone: tenant.tenant.business_phone,
        vat_number: tenant.tenant.vat_number,
        company_number: tenant.tenant.company_number,
      },
      estimate,
      lines,
    });
  } catch (err) {
    return {
      ok: false,
      error: `Could not render the PDF: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }

  const path = `${estimate.tenant_id}/${estimate.id}.pdf`;
  const { error: upErr } = await admin.storage
    .from('estimate-pdfs')
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

  const { error: updErr } = await admin
    .from('estimates')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      accept_token: token,
      pdf_storage_path: path,
    })
    .eq('id', id);
  if (updErr) return { ok: false, error: updErr.message };

  const viewUrl = `${publicAppUrl()}/q/${token}`;

  // Email the client if we have an address. Never fail the send over email.
  let emailed = false;
  if (estimate.client_email) {
    try {
      await sendEstimateEmail({
        to: estimate.client_email,
        businessName: tenant.tenant.name,
        clientName: estimate.client_name,
        quoteTitle: estimate.title,
        quoteNumber: estimate.number,
        totalLabel: gbp(Number(estimate.total_pence)),
        viewUrl,
        validUntilLabel: estimate.valid_until
          ? formatDate(estimate.valid_until)
          : null,
        pdf,
      });
      emailed = true;
    } catch (err) {
      console.error('[send-estimate] email failed', err);
    }
  }

  revalidatePath(`/${tenant.tenant.slug}/estimates`);
  revalidatePath(`/${tenant.tenant.slug}/estimates/${id}`);
  return { ok: true, token, view_url: viewUrl, emailed };
}

/** Short-lived signed URL to the stored quote PDF (owner/PM download). */
export async function getEstimatePdfUrl(
  id: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const admin = getSupabaseAdmin();
  const { data: est } = await admin
    .from('estimates')
    .select('tenant_id, pdf_storage_path')
    .eq('id', id)
    .maybeSingle();
  if (!est || est.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not found.' };
  }
  if (!est.pdf_storage_path) return { ok: false, error: 'No PDF yet.' };
  const { data, error } = await admin.storage
    .from('estimate-pdfs')
    .createSignedUrl(est.pdf_storage_path, 3600);
  if (error || !data) return { ok: false, error: error?.message ?? 'Failed.' };
  return { ok: true, url: data.signedUrl };
}

/**
 * Accept a quote from the public shareable link. UNAUTHENTICATED: the caller
 * is a prospect with no account — the unguessable accept_token is the
 * capability. Uses the service role, validates status + expiry, records the
 * typed signature, and notifies the builder by email.
 */
export async function acceptEstimateByToken(
  token: string,
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = (fullName ?? '').trim();
  if (name.length < 2) {
    return { ok: false, error: 'Please type your name to accept.' };
  }
  if (!token || token.length < 16) {
    return { ok: false, error: 'Invalid link.' };
  }
  const admin = getSupabaseAdmin();

  const { data: est } = await admin
    .from('estimates')
    .select(
      'id, tenant_id, number, title, total_pence, status, valid_until, client_name',
    )
    .eq('accept_token', token)
    .maybeSingle();
  if (!est) return { ok: false, error: 'Quote not found.' };
  if (est.status === 'accepted') return { ok: true }; // idempotent
  if (est.status !== 'sent' && est.status !== 'draft') {
    return { ok: false, error: 'This quote can no longer be accepted.' };
  }
  if (
    est.valid_until &&
    new Date(est.valid_until + 'T23:59:59').getTime() < Date.now()
  ) {
    return {
      ok: false,
      error: 'This quote has expired — please ask your builder for an updated one.',
    };
  }

  const { error } = await admin
    .from('estimates')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      client_signature: name,
    })
    .eq('id', est.id);
  if (error) return { ok: false, error: error.message };

  // Notify the builder — never fail acceptance over the email.
  try {
    const { data: tenant } = await admin
      .from('tenants')
      .select('name, business_email')
      .eq('id', est.tenant_id)
      .maybeSingle();
    if (tenant?.business_email) {
      await sendEstimateAcceptedEmail({
        to: tenant.business_email,
        businessName: tenant.name,
        quoteNumber: est.number,
        quoteTitle: est.title,
        clientName: est.client_name,
        totalLabel: gbp(Number(est.total_pence)),
        signedBy: name,
      });
    }
  } catch (err) {
    console.error('[accept-estimate] notify failed', err);
  }

  revalidatePath(`/q/${token}`);
  return { ok: true };
}

export interface ConvertEstimateInput {
  start_date: string; // YYYY-MM-DD
  estimated_end_date: string; // YYYY-MM-DD
  address_line1: string;
  city: string;
  postcode: string;
}

export interface ConvertResult {
  ok: boolean;
  error?: string;
  projectId?: string;
}

/**
 * Turn a won quote into a project. Mirrors createProject: seeds the 8 default
 * stages and — following the app's existing pattern — defaults the client to
 * the current user as a placeholder (the builder then invites the real client
 * and reassigns). Carries the estimate total across as quoted_amount_pence and
 * links the estimate to the new project.
 */
export async function convertEstimateToProject(
  estimateId: string,
  input: ConvertEstimateInput,
): Promise<ConvertResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can convert quotes.' };
  }
  const start = (input.start_date ?? '').trim();
  const end = (input.estimated_end_date ?? '').trim();
  const addr = (input.address_line1 ?? '').trim();
  const city = (input.city ?? '').trim();
  const postcode = (input.postcode ?? '').trim();
  if (!start || !end) return { ok: false, error: 'Set a start and end date.' };
  if (new Date(end).getTime() < new Date(start).getTime()) {
    return { ok: false, error: 'The end date is before the start date.' };
  }
  if (!addr || !city || !postcode) {
    return { ok: false, error: 'Add the site address (line 1, town and postcode).' };
  }

  const supabase = await createSupabaseServer();

  const { data: estRow } = await supabase
    .from('estimates')
    .select('id, tenant_id, title, total_pence, project_id, project_type')
    .eq('id', estimateId)
    .maybeSingle();
  if (!estRow) return { ok: false, error: 'Quote not found.' };
  if (estRow.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  if (estRow.project_id) {
    return { ok: true, projectId: estRow.project_id as string };
  }

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      tenant_id: tenant.tenant.id,
      name: estRow.title,
      address_line1: addr,
      address_line2: null,
      city,
      postcode: postcode.toUpperCase(),
      client_id: tenant.user_id, // placeholder; reassign after inviting client
      pm_id: tenant.user_id,
      start_date: start,
      estimated_end_date: end,
      // Column CHECK is strictly > 0; a £0 quote stores null rather than 0.
      quoted_amount_pence:
        Number(estRow.total_pence) > 0 ? Number(estRow.total_pence) : null,
      project_type: estRow.project_type ?? null,
    })
    .select('id')
    .single();

  if (projErr) {
    if (
      projErr.code === 'check_violation' ||
      projErr.message.toLowerCase().includes('limit reached')
    ) {
      return {
        ok: false,
        error:
          "You've hit your plan's active project limit. Archive a finished project or upgrade to add more.",
      };
    }
    return { ok: false, error: projErr.message };
  }

  const stageRows = distributeStages(
    start,
    end,
    stagesForTemplate(estRow.project_type as string | null),
  ).map((s) => ({
    tenant_id: tenant.tenant.id,
    project_id: project.id,
    position: s.position,
    name: s.name,
    start_date: s.start_date,
    target_end_date: s.target_end_date,
    status: 'not_started' as const,
  }));
  if (stageRows.length > 0) {
    const { error: stagesErr } = await supabase
      .from('project_stages')
      .insert(stageRows);
    if (stagesErr) {
      await supabase.from('projects').delete().eq('id', project.id);
      return { ok: false, error: stagesErr.message };
    }
  }

  const { error: linkErr } = await supabase
    .from('estimates')
    .update({ project_id: project.id })
    .eq('id', estimateId);
  if (linkErr) {
    // Project exists but the link failed — surface it; the project is usable.
    return { ok: false, error: `Project created but linking failed: ${linkErr.message}` };
  }

  revalidatePath(`/${tenant.tenant.slug}/projects`);
  revalidatePath(`/${tenant.tenant.slug}/estimates/${estimateId}`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true, projectId: project.id as string };
}
