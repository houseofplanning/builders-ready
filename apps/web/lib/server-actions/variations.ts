'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { variationCreate } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface VariationActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

// -------------------------------------------------------------------------
// proposeVariationOnWeb — owner/PM creates a variation. Client still
// signs on mobile; web is propose-only (and view).
// -------------------------------------------------------------------------
export async function proposeVariationOnWeb(
  raw: Record<string, unknown>,
): Promise<VariationActionResult> {
  const parsed = variationCreate.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can propose variations.' };
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
    .from('variations')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: parsed.data.project_id,
      proposed_by: tenant.user_id,
      number: parsed.data.number,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      delta_amount_gbp_pence: parsed.data.delta_amount_gbp_pence,
      delta_days: parsed.data.delta_days,
      status: 'proposed',
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Insert failed.' };

  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true, id: row.id };
}

// -------------------------------------------------------------------------
// withdrawVariationOnWeb — owner/PM can withdraw a proposed variation
// that hasn't been signed yet. Once signed it's a contractual record and
// shouldn't be deleted from the audit trail.
// -------------------------------------------------------------------------
const withdrawSchema = z.object({
  variation_id: z.string().uuid(),
});

export async function withdrawVariationOnWeb(
  raw: Record<string, unknown>,
): Promise<VariationActionResult> {
  const parsed = withdrawSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can withdraw variations.' };
  }
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from('variations')
    .select('status, project_id, tenant_id')
    .eq('id', parsed.data.variation_id)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Variation not found.' };
  if (existing.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  if (existing.status === 'accepted') {
    return {
      ok: false,
      error: 'This variation has been signed by the client and cannot be withdrawn.',
    };
  }
  const { error } = await supabase
    .from('variations')
    .update({ status: 'withdrawn', decided_at: new Date().toISOString() })
    .eq('id', parsed.data.variation_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${existing.project_id}`);
  return { ok: true };
}
