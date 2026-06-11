'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';
import { getSupabaseAdmin } from '../supabase-admin';

export interface ReportActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

// -------------------------------------------------------------------------
// createStructuredReportOnWeb — form-filled report (summary, next week,
// risks, decisions needed). Use case: builder writes a weekly note.
// -------------------------------------------------------------------------
const structuredSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  summary: z.string().min(1).max(5000),
  next_week: z.string().max(2000).nullable().optional(),
  risks: z.string().max(2000).nullable().optional(),
  decisions_needed: z.string().max(2000).nullable().optional(),
});

export async function createStructuredReportOnWeb(
  raw: Record<string, unknown>,
): Promise<ReportActionResult> {
  const parsed = structuredSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can post reports.' };
  }
  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id')
    .eq('id', parsed.data.project_id)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised for this project.' };
  }

  const { data: row, error } = await supabase
    .from('reports')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: parsed.data.project_id,
      posted_by: tenant.user_id,
      title: parsed.data.title,
      kind: 'structured',
      summary: parsed.data.summary,
      next_week: parsed.data.next_week ?? null,
      risks: parsed.data.risks ?? null,
      decisions_needed: parsed.data.decisions_needed ?? null,
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Insert failed.' };

  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  return { ok: true, id: row.id };
}

// -------------------------------------------------------------------------
// uploadPdfReport — accept a multipart form with title + pdf file,
// upload to the reports storage bucket, insert the report row.
// -------------------------------------------------------------------------
export async function uploadPdfReport(
  formData: FormData,
): Promise<ReportActionResult> {
  const projectId = String(formData.get('project_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const file = formData.get('file');

  if (!projectId || !title) {
    return { ok: false, error: 'Title and project id are required.' };
  }
  if (!(file instanceof File)) {
    return { ok: false, error: 'PDF file is required.' };
  }
  if (file.type !== 'application/pdf') {
    return { ok: false, error: 'File must be a PDF.' };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: 'PDF is too large (max 20 MB).' };
  }

  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can post reports.' };
  }

  const supabase = await createSupabaseServer();
  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }

  // Upload via admin client (the reports bucket may have stricter
  // write policies than the public anon-key can satisfy).
  const admin = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${tenant.tenant.id}/${projectId}/${Date.now()}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from('reports')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: `Upload failed: ${uploadErr.message}` };
  }

  const { data: row, error } = await supabase
    .from('reports')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: projectId,
      posted_by: tenant.user_id,
      title,
      kind: 'pdf',
      pdf_storage_path: storagePath,
    })
    .select('id')
    .single();
  if (error || !row) {
    // Try to clean up the orphan upload.
    await admin.storage.from('reports').remove([storagePath]);
    return { ok: false, error: error?.message ?? 'Insert failed.' };
  }

  revalidatePath(`/${tenant.tenant.slug}/projects/${projectId}`);
  return { ok: true, id: row.id };
}

// -------------------------------------------------------------------------
// signedUrlForReport — generate a short-lived URL the browser can use
// to view/download a report PDF.
// -------------------------------------------------------------------------
export async function signedUrlForReport(
  storagePath: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.storage
    .from('reports')
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? 'Could not sign URL.' };
  }
  return { ok: true, url: data.signedUrl };
}
