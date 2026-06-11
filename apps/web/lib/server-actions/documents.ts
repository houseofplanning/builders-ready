'use server';

import { revalidatePath } from 'next/cache';
import { DOCUMENT_CATEGORIES, type DocumentCategory } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';
import { getSupabaseAdmin } from '../supabase-admin';

const BUCKET = 'project-documents';
const MAX_BYTES = 50 * 1024 * 1024; // 50 MiB — matches the bucket limit.

export interface DocumentActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** Strip anything risky from an uploaded filename while keeping a sensible
 *  base + extension. */
function safeFileName(raw: string): string {
  const trimmed = raw.trim().slice(0, 200);
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  return cleaned.replace(/^[-.]+|[-.]+$/g, '') || 'file';
}

// -------------------------------------------------------------------------
// uploadDocument — web (owner / PM) uploads a file to a project's vault.
// -------------------------------------------------------------------------
export async function uploadDocument(
  formData: FormData,
): Promise<DocumentActionResult> {
  const projectId = String(formData.get('project_id') ?? '');
  const categoryRaw = String(formData.get('category') ?? 'other');
  const file = formData.get('file');

  if (!projectId) return { ok: false, error: 'Project id is required.' };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Please choose a file to upload.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'File is too large (max 50 MB).' };
  }
  const category: DocumentCategory = (
    DOCUMENT_CATEGORIES as readonly string[]
  ).includes(categoryRaw)
    ? (categoryRaw as DocumentCategory)
    : 'other';

  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can upload documents here.' };
  }

  const supabase = await createSupabaseServer();
  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised for this project.' };
  }

  const original = safeFileName(file.name || 'document');
  const storagePath = `${tenant.tenant.id}/${projectId}/${crypto.randomUUID()}-${original}`;

  const admin = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: `Upload failed: ${uploadErr.message}` };
  }

  const { data: row, error } = await supabase
    .from('documents')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: projectId,
      uploaded_by: tenant.user_id,
      name: file.name?.trim().slice(0, 200) || original,
      category,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select('id')
    .single();
  if (error || !row) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: error?.message ?? 'Could not save the document.' };
  }

  revalidatePath(`/${tenant.tenant.slug}/projects/${projectId}`);
  return { ok: true, id: row.id };
}

// -------------------------------------------------------------------------
// deleteDocument — remove a document row + its stored file. RLS already
// restricts deletes to the uploader or owner/PM; we re-check the row first.
// -------------------------------------------------------------------------
export async function deleteDocument(id: string): Promise<DocumentActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };

  const supabase = await createSupabaseServer();
  const { data: doc } = await supabase
    .from('documents')
    .select('id, project_id, storage_path')
    .eq('id', id)
    .maybeSingle();
  if (!doc) return { ok: false, error: 'Document not found.' };

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  // Best-effort: clean up the stored object.
  await getSupabaseAdmin().storage.from(BUCKET).remove([doc.storage_path]);

  revalidatePath(`/${tenant.tenant.slug}/projects/${doc.project_id}`);
  return { ok: true, id };
}

// -------------------------------------------------------------------------
// signedUrlForDocument — short-lived URL to view / download a document.
// -------------------------------------------------------------------------
export async function signedUrlForDocument(
  storagePath: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? 'Could not open the file.' };
  }
  return { ok: true, url: data.signedUrl };
}
