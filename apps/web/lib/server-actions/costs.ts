'use server';

import { revalidatePath } from 'next/cache';
import { projectCostCreate } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { getSupabaseAdmin } from '../supabase-admin';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface CostActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createCostOnWeb(
  raw: Record<string, unknown>,
): Promise<CostActionResult> {
  const parsed = projectCostCreate.safeParse(raw);
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
    return { ok: false, error: 'Only owners and PMs can log costs.' };
  }
  const supabase = await createSupabaseServer();
  const d = parsed.data;

  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id')
    .eq('id', d.project_id)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised for this project.' };
  }

  const { data: row, error } = await supabase
    .from('project_costs')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: d.project_id,
      created_by: tenant.user_id,
      category: d.category,
      description: d.description,
      amount_pence: d.amount_pence,
      supplier: d.supplier ?? null,
      incurred_on: d.incurred_on,
      receipt_storage_path: d.receipt_storage_path ?? null,
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Insert failed.' };

  revalidatePath(`/${tenant.tenant.slug}/projects/${d.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true, id: row.id };
}

export async function deleteCostOnWeb(id: string): Promise<CostActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can delete costs.' };
  }
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from('project_costs')
    .select('tenant_id, project_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Cost not found.' };
  if (existing.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  const { error } = await supabase.from('project_costs').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${existing.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true };
}

/** Short-lived signed URL to a cost's receipt (owner/PM only). */
export async function getCostReceiptUrl(
  id: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Not authorised.' };
  }
  const admin = getSupabaseAdmin();
  const { data: cost } = await admin
    .from('project_costs')
    .select('tenant_id, receipt_storage_path')
    .eq('id', id)
    .maybeSingle();
  if (!cost || cost.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not found.' };
  }
  if (!cost.receipt_storage_path) return { ok: false, error: 'No receipt.' };
  const { data, error } = await admin.storage
    .from('cost-receipts')
    .createSignedUrl(cost.receipt_storage_path, 3600);
  if (error || !data) return { ok: false, error: error?.message ?? 'Failed.' };
  return { ok: true, url: data.signedUrl };
}
