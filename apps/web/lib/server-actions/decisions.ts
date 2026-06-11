'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { decisionCreate } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface DecisionActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

// -------------------------------------------------------------------------
// raiseDecisionOnWeb — create a decision with options for a project.
// Same shape the mobile app uses; this is just the web entry point.
// -------------------------------------------------------------------------
export async function raiseDecisionOnWeb(
  raw: Record<string, unknown>,
): Promise<DecisionActionResult> {
  const parsed = decisionCreate.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can raise decisions.' };
  }

  const supabase = await createSupabaseServer();

  // Confirm the project belongs to this tenant before writing.
  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id, slug:tenant_id')
    .eq('id', parsed.data.project_id)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised for this project.' };
  }

  // Insert the decision row.
  const { data: row, error: insertErr } = await supabase
    .from('decisions')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: parsed.data.project_id,
      raised_by: tenant.user_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      deadline: parsed.data.deadline ?? null,
      status: 'open',
    })
    .select('id')
    .single();
  if (insertErr || !row) {
    return { ok: false, error: insertErr?.message ?? 'Insert failed.' };
  }

  // Insert options. If this fails, clean up the orphan decision.
  const optionRows = parsed.data.options.map((o, idx) => ({
    decision_id: row.id,
    tenant_id: tenant.tenant.id,
    label: o.label,
    description: o.description ?? null,
    price_gbp_pence: o.price_gbp_pence ?? null,
    photo_storage_path: o.photo_storage_path ?? null,
    position: idx,
  }));
  const { error: optErr } = await supabase
    .from('decision_options')
    .insert(optionRows);
  if (optErr) {
    await supabase.from('decisions').delete().eq('id', row.id);
    return { ok: false, error: optErr.message };
  }

  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true, id: row.id };
}

// -------------------------------------------------------------------------
// decideOnWeb — for the rare case where a PM/owner needs to record a
// decision outcome on a client's behalf (e.g. client confirmed by phone).
// This is the SAME path the client uses on mobile.
// -------------------------------------------------------------------------
const decideSchema = z.object({
  decision_id: z.string().uuid(),
  outcome: z.enum(['accepted', 'rejected']),
  selected_option_id: z.string().uuid().nullable(),
});

export async function decideOnWeb(
  raw: Record<string, unknown>,
): Promise<DecisionActionResult> {
  const parsed = decideSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can decide on the web.' };
  }
  const supabase = await createSupabaseServer();
  const { error, data: row } = await supabase
    .from('decisions')
    .update({
      status: parsed.data.outcome,
      selected_option_id:
        parsed.data.outcome === 'accepted'
          ? parsed.data.selected_option_id
          : null,
      decided_at: new Date().toISOString(),
      decided_by: tenant.user_id,
    })
    .eq('id', parsed.data.decision_id)
    .select('project_id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (row?.project_id) {
    revalidatePath(`/${tenant.tenant.slug}/projects/${row.project_id}`);
  }
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true };
}
