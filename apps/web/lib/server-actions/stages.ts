'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

const updateStageSchema = z.object({
  stage_id: z.string().uuid(),
  status: z.enum(['not_started', 'in_progress', 'complete', 'delayed']),
});

export interface StageActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Change a stage's status. The DB-side `on_stage_change` trigger recomputes
 * project progress %; `on_stage_status_changed` fires the push notification
 * to the client.
 */
export async function updateStageStatus(
  raw: Record<string, unknown>,
): Promise<StageActionResult> {
  const parsed = updateStageSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can change stages.' };
  }

  const supabase = await createSupabaseServer();
  const payload: {
    status: typeof parsed.data.status;
    actual_end_date?: string | null;
  } = { status: parsed.data.status };

  // Stamp actual_end_date when marking complete; clear it when un-completing.
  if (parsed.data.status === 'complete') {
    payload.actual_end_date = new Date().toISOString().slice(0, 10);
  } else {
    payload.actual_end_date = null;
  }

  const { data, error } = await supabase
    .from('project_stages')
    .update(payload)
    .eq('id', parsed.data.stage_id)
    .select('project_id, tenant_id')
    .single();
  if (error) return { ok: false, error: error.message };

  if (data) {
    revalidatePath(`/${tenant.tenant.slug}/projects/${data.project_id}`);
  }
  return { ok: true };
}

const renameStageSchema = z.object({
  stage_id: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function renameStage(
  raw: Record<string, unknown>,
): Promise<StageActionResult> {
  const parsed = renameStageSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can rename stages.' };
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('project_stages')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.stage_id)
    .select('project_id')
    .single();
  if (error) return { ok: false, error: error.message };
  if (data) revalidatePath(`/${tenant.tenant.slug}/projects/${data.project_id}`);
  return { ok: true };
}
