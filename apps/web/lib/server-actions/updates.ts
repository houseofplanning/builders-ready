'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

const postUpdateSchema = z.object({
  project_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  headline: z.string().max(200).nullable().optional(),
  body: z.string().min(1, 'Add some text to the update').max(4000),
  decision_needed: z.string().max(500).nullable().optional(),
  stage_status: z
    .enum(['keep', 'in_progress', 'complete', 'delayed'])
    .optional(),
});

export interface UpdateActionResult {
  ok: boolean;
  error?: string;
  updateId?: string;
}

/**
 * Post a project update. If `stage_status` is set to something other than
 * 'keep', flip the stage status at the same time (one of the most common
 * PM actions — "finished plastering today" should mark the stage complete).
 */
export async function postProjectUpdate(
  raw: Record<string, unknown>,
): Promise<UpdateActionResult> {
  const parsed = postUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can post updates.' };
  }

  const supabase = await createSupabaseServer();

  // 1. If the PM signalled a stage status change, flip the stage first.
  //    The DB trigger recomputes project progress on the flip.
  if (parsed.data.stage_status && parsed.data.stage_status !== 'keep') {
    const stagePayload: {
      status: 'in_progress' | 'complete' | 'delayed';
      actual_end_date?: string | null;
    } = { status: parsed.data.stage_status };
    if (parsed.data.stage_status === 'complete') {
      stagePayload.actual_end_date = new Date().toISOString().slice(0, 10);
    } else {
      stagePayload.actual_end_date = null;
    }
    const { error: stageErr } = await supabase
      .from('project_stages')
      .update(stagePayload)
      .eq('id', parsed.data.stage_id);
    if (stageErr) return { ok: false, error: stageErr.message };
  }

  // 2. Insert the update. The trigger fires send_push → client gets notified.
  const { data: row, error: insertErr } = await supabase
    .from('project_updates')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: parsed.data.project_id,
      stage_id: parsed.data.stage_id,
      posted_by: tenant.user_id,
      headline: parsed.data.headline ?? null,
      body: parsed.data.body,
      decision_needed: parsed.data.decision_needed ?? null,
    })
    .select('id')
    .single();
  if (insertErr) return { ok: false, error: insertErr.message };

  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  return { ok: true, updateId: row.id };
}

export async function deleteUpdate(updateId: string): Promise<UpdateActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const supabase = await createSupabaseServer();
  const { data: row } = await supabase
    .from('project_updates')
    .select('project_id, posted_by')
    .eq('id', updateId)
    .single();
  if (!row) return { ok: false, error: 'Update not found.' };
  if (row.posted_by !== tenant.user_id && tenant.role !== 'owner') {
    return { ok: false, error: 'You can only delete your own updates.' };
  }
  const { error } = await supabase
    .from('project_updates')
    .delete()
    .eq('id', updateId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${row.project_id}`);
  return { ok: true };
}
