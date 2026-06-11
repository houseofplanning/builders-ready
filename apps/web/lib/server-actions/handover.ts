'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '../supabase-admin';
import { resolveCurrentTenant } from '../tenant-resolver';
import { renderHandoverPdfBuffer } from '../pdf/handover';

export interface HandoverResult {
  ok: boolean;
  error?: string;
  storage_path?: string;
}

/**
 * Build the handover PDF for a project, upload to the `handovers` bucket,
 * stamp `projects.handover_pdf_storage_path`, and return the path.
 *
 * Owner-only (avoids PMs accidentally finalising a record their owner
 * isn't ready to share). Client can READ via has_project_access once
 * the path is set.
 */
export async function generateHandoverPdf(
  projectId: string,
): Promise<HandoverResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can generate the handover PDF.' };
  }

  const admin = getSupabaseAdmin();

  // ---------- 1. Fetch every block of project data we render ----------
  const [
    { data: project },
    { data: stages },
    { data: updates },
    { data: decisions },
    { data: decisionOptions },
    { data: variations },
    { data: invoices },
  ] = await Promise.all([
    admin
      .from('projects')
      .select(
        `*,
         client:profiles!projects_client_id_fkey(full_name, email),
         pm:profiles!projects_pm_id_fkey(full_name, email)`,
      )
      .eq('id', projectId)
      .maybeSingle(),
    admin
      .from('project_stages')
      .select('*')
      .eq('project_id', projectId)
      .order('position'),
    admin
      .from('project_updates')
      .select('id, headline, body, decision_needed, posted_at, posted_by, stage_id')
      .eq('project_id', projectId)
      .order('posted_at'),
    admin
      .from('decisions')
      .select('id, title, description, status, decided_at, decided_by, selected_option_id')
      .eq('project_id', projectId)
      .order('created_at'),
    admin
      .from('decision_options')
      .select('id, decision_id, label, price_gbp_pence'),
    admin
      .from('variations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at'),
    admin
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('issued_at'),
  ]);

  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }

  // ---------- 2. Resolve profile names for updates + variations + decisions ----------
  const profileIds = new Set<string>();
  (updates ?? []).forEach((u) => u.posted_by && profileIds.add(u.posted_by));
  (variations ?? []).forEach((v) => {
    if (v.proposed_by) profileIds.add(v.proposed_by);
    if (v.decided_by) profileIds.add(v.decided_by);
  });
  (decisions ?? []).forEach((d) => {
    if (d.decided_by) profileIds.add(d.decided_by);
  });

  const { data: profiles } = profileIds.size
    ? await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(profileIds))
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (id: string | null | undefined) =>
    (id && profiles?.find((p) => p.id === id)?.full_name) || 'Someone';

  const stageNameById = new Map(
    (stages ?? []).map((s) => [s.id as string, s.name as string]),
  );

  // ---------- 3. Build the typed payload ----------
  const client = Array.isArray(project.client) ? project.client[0] : project.client;
  const pm = Array.isArray(project.pm) ? project.pm[0] : project.pm;

  const payload = {
    tenant: {
      name: tenant.tenant.name,
      business_email: tenant.tenant.business_email,
      company_number: tenant.tenant.company_number,
      vat_number: tenant.tenant.vat_number,
      bank_name: tenant.tenant.bank_name,
      bank_account_name: tenant.tenant.bank_account_name,
      bank_sort_code: tenant.tenant.bank_sort_code,
      bank_account_number: tenant.tenant.bank_account_number,
    },
    project: {
      ...project,
      client: { full_name: client?.full_name ?? '—', email: client?.email ?? '—' },
      pm: { full_name: pm?.full_name ?? '—', email: pm?.email ?? '—' },
    } as never,
    stages: (stages ?? []) as never,
    updates: (updates ?? []).map((u) => ({
      headline: u.headline,
      body: u.body,
      posted_at: u.posted_at,
      decision_needed: u.decision_needed,
      posted_by_name: nameOf(u.posted_by),
      stage_name: stageNameById.get(u.stage_id) ?? '—',
    })),
    decisions: (decisions ?? []).map((d) => {
      const chosen = d.selected_option_id
        ? decisionOptions?.find((o) => o.id === d.selected_option_id)
        : null;
      return {
        title: d.title,
        description: d.description,
        status: d.status,
        decided_at: d.decided_at,
        decided_by_name: d.decided_by ? nameOf(d.decided_by) : null,
        chosen_label: chosen?.label ?? null,
        chosen_price_pence: (chosen?.price_gbp_pence as number | null) ?? null,
      };
    }),
    variations: (variations ?? []).map((v) => ({
      number: v.number,
      title: v.title,
      description: v.description,
      delta_amount_gbp_pence: Number(v.delta_amount_gbp_pence),
      delta_days: v.delta_days,
      status: v.status,
      decided_at: v.decided_at,
      client_signature: v.client_signature,
      proposed_by_name: nameOf(v.proposed_by),
    })),
    invoices: (invoices ?? []) as never,
  };

  // ---------- 4. Render the PDF ----------
  let buffer: Buffer;
  try {
    buffer = await renderHandoverPdfBuffer(payload);
  } catch (err) {
    return {
      ok: false,
      error: `PDF render failed: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }

  // ---------- 5. Upload to handovers bucket ----------
  const objectPath = `${tenant.tenant.id}/${projectId}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from('handovers')
    .upload(objectPath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (uploadErr) {
    return { ok: false, error: `Upload failed: ${uploadErr.message}` };
  }

  // ---------- 6. Stamp the project row ----------
  await admin
    .from('projects')
    .update({ handover_pdf_storage_path: objectPath })
    .eq('id', projectId);

  revalidatePath(`/${tenant.tenant.slug}/projects/${projectId}`);
  return { ok: true, storage_path: objectPath };
}

/**
 * Return a signed URL the caller can use to download the existing PDF.
 * Anyone with project access can request this (RLS via has_project_access
 * + the handovers_read storage policy).
 */
export async function getHandoverDownloadUrl(
  projectId: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const admin = getSupabaseAdmin();
  const { data: project } = await admin
    .from('projects')
    .select('handover_pdf_storage_path, tenant_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project || project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Project not found.' };
  }
  if (!project.handover_pdf_storage_path) {
    return { ok: false, error: 'No handover PDF generated yet.' };
  }
  const { data, error } = await admin.storage
    .from('handovers')
    .createSignedUrl(project.handover_pdf_storage_path, 60 * 60);
  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? 'Could not sign URL.' };
  }
  return { ok: true, url: data.signedUrl };
}
