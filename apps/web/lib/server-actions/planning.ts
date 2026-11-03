'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface PlanningStageResult {
  ok: boolean;
  error?: string;
}

const STAGES = ['saved', 'approached', 'replied', 'won', 'not_interested'];

export async function setPlanningStageOnWeb(
  listingId: string,
  stage: string,
): Promise<PlanningStageResult> {
  if (!STAGES.includes(stage)) return { ok: false, error: 'Invalid stage.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Planning Radar is for trade accounts.' };
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('planning_listing_actions').upsert(
    {
      listing_id: listingId,
      tenant_id: tenant.tenant.id,
      created_by: tenant.user_id,
      stage,
    },
    { onConflict: 'listing_id,tenant_id' },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/planning-radar/${listingId}`);
  revalidatePath(`/${tenant.tenant.slug}/planning-radar`);
  return { ok: true };
}
