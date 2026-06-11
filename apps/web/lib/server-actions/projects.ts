'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { projectCreate, distributeStages } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface ProjectActionResult {
  ok: boolean;
  error?: string;
  projectId?: string;
}

// -------------------------------------------------------------------------
// createProject — auto-seeds 8 default stages, returns the new project id.
// -------------------------------------------------------------------------
export async function createProject(
  raw: Record<string, unknown>,
): Promise<ProjectActionResult> {
  const parsed = projectCreate.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can create projects.' };
  }

  const supabase = await createSupabaseServer();

  // Insert the project. The DB trigger enforces the active-project limit
  // per subscription tier; it raises check_violation if exceeded.
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      tenant_id: tenant.tenant.id,
      name: parsed.data.name,
      address_line1: parsed.data.address_line1,
      address_line2: parsed.data.address_line2 ?? null,
      city: parsed.data.city,
      postcode: parsed.data.postcode.toUpperCase(),
      client_id: parsed.data.client_id,
      pm_id: parsed.data.pm_id,
      start_date: parsed.data.start_date,
      estimated_end_date: parsed.data.estimated_end_date,
      quoted_amount_pence: parsed.data.quoted_amount_pence ?? null,
    })
    .select('id')
    .single();

  if (projErr) {
    if (projErr.code === 'check_violation' || projErr.message.toLowerCase().includes('limit reached')) {
      return {
        ok: false,
        error: "You've hit your plan's active project limit. Archive a finished project or upgrade your plan to add more.",
      };
    }
    return { ok: false, error: projErr.message };
  }

  // Seed 8 default stages.
  const stageRows = distributeStages(
    parsed.data.start_date,
    parsed.data.estimated_end_date,
  ).map((s) => ({
    tenant_id: tenant.tenant.id,
    project_id: project.id,
    position: s.position,
    name: s.name,
    start_date: s.start_date,
    target_end_date: s.target_end_date,
    status: 'not_started' as const,
  }));

  const { error: stagesErr } = await supabase
    .from('project_stages')
    .insert(stageRows);
  if (stagesErr) {
    // Best-effort cleanup; the project trigger should also recompute.
    await supabase.from('projects').delete().eq('id', project.id);
    return { ok: false, error: stagesErr.message };
  }

  revalidatePath(`/${tenant.tenant.slug}/projects`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true, projectId: project.id };
}

// -------------------------------------------------------------------------
// reassignProjectClient — repoint a project at a different tenant member
// with role 'client'. Needed because the create-project form defaults the
// client to the current user when no other clients exist; once the real
// client accepts their invite, owner/PM uses this to fix the link.
// -------------------------------------------------------------------------
const reassignClientSchema = z.object({
  project_id: z.string().uuid(),
  new_client_user_id: z.string().uuid(),
});

export async function reassignProjectClient(
  raw: Record<string, unknown>,
): Promise<ProjectActionResult> {
  const parsed = reassignClientSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can reassign clients.' };
  }
  const supabase = await createSupabaseServer();

  // Verify the target user is a tenant member with role 'client'.
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', parsed.data.new_client_user_id)
    .eq('tenant_id', tenant.tenant.id)
    .maybeSingle();
  if (!member || member.role !== 'client') {
    return {
      ok: false,
      error: 'That user is not a client of this tenant yet — invite them first.',
    };
  }

  const { error } = await supabase
    .from('projects')
    .update({ client_id: parsed.data.new_client_user_id })
    .eq('id', parsed.data.project_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/team`);
  return { ok: true, projectId: parsed.data.project_id };
}

// -------------------------------------------------------------------------
// reassignProjectPm — repoint a project at a different owner/PM. Same
// motivation as reassignProjectClient: lonely-tenant defaults at create
// time mean a project is often stuck on the owner until they delegate.
// -------------------------------------------------------------------------
const reassignPmSchema = z.object({
  project_id: z.string().uuid(),
  new_pm_user_id: z.string().uuid(),
});

export async function reassignProjectPm(
  raw: Record<string, unknown>,
): Promise<ProjectActionResult> {
  const parsed = reassignPmSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can reassign the PM.' };
  }
  const supabase = await createSupabaseServer();

  // Verify the target user is a tenant member with role owner or pm.
  const { data: member } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', parsed.data.new_pm_user_id)
    .eq('tenant_id', tenant.tenant.id)
    .maybeSingle();
  if (!member || (member.role !== 'owner' && member.role !== 'pm')) {
    return {
      ok: false,
      error: 'That user is not an owner or PM of this tenant.',
    };
  }

  const { error } = await supabase
    .from('projects')
    .update({ pm_id: parsed.data.new_pm_user_id })
    .eq('id', parsed.data.project_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/team`);
  return { ok: true, projectId: parsed.data.project_id };
}

// -------------------------------------------------------------------------
// archiveProject — frees a slot against the tier limit.
// -------------------------------------------------------------------------
export async function archiveProject(projectId: string): Promise<void> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) redirect('/login');
  if (tenant.role !== 'owner' && tenant.role !== 'pm') return;
  const supabase = await createSupabaseServer();
  await supabase
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', projectId);
  revalidatePath(`/${tenant.tenant.slug}/projects`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
}

// -------------------------------------------------------------------------
// setProjectStatus — active / on_hold / completed (not archived; that's
// the archive action above).
// -------------------------------------------------------------------------
const statusSchema = z.object({
  project_id: z.string().uuid(),
  status: z.enum(['active', 'on_hold', 'completed']),
});

export async function setProjectStatus(
  raw: Record<string, unknown>,
): Promise<ProjectActionResult> {
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can change project status.' };
  }
  const supabase = await createSupabaseServer();
  const payload: { status: typeof parsed.data.status; actual_end_date?: string } = {
    status: parsed.data.status,
  };
  if (parsed.data.status === 'completed') {
    payload.actual_end_date = new Date().toISOString().slice(0, 10);
  }
  const { error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', parsed.data.project_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  return { ok: true };
}
