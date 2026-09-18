'use server';

import { revalidatePath } from 'next/cache';
import { savedRateInput } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface SavedRateActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createSavedRateOnWeb(
  raw: Record<string, unknown>,
): Promise<SavedRateActionResult> {
  const parsed = savedRateInput.safeParse(raw);
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
    return { ok: false, error: 'Only owners and PMs can manage rates.' };
  }
  const supabase = await createSupabaseServer();

  // Append to the end of the current list.
  const { data: last } = await supabase
    .from('saved_rates')
    .select('position')
    .eq('tenant_id', tenant.tenant.id)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = last && last[0] ? Number(last[0].position) + 1 : 0;

  const { data, error } = await supabase
    .from('saved_rates')
    .insert({
      tenant_id: tenant.tenant.id,
      kind: parsed.data.kind,
      description: parsed.data.description,
      unit: parsed.data.unit,
      default_unit_cost_pence: parsed.data.default_unit_cost_pence,
      default_markup_percent: parsed.data.default_markup_percent,
      position: nextPos,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Failed.' };

  revalidatePath(`/${tenant.tenant.slug}/estimates/rates`);
  return { ok: true, id: data.id as string };
}

export async function updateSavedRateOnWeb(
  id: string,
  raw: Record<string, unknown>,
): Promise<SavedRateActionResult> {
  const parsed = savedRateInput.safeParse(raw);
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
    return { ok: false, error: 'Only owners and PMs can manage rates.' };
  }
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from('saved_rates')
    .select('tenant_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing || existing.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  const { error } = await supabase
    .from('saved_rates')
    .update({
      kind: parsed.data.kind,
      description: parsed.data.description,
      unit: parsed.data.unit,
      default_unit_cost_pence: parsed.data.default_unit_cost_pence,
      default_markup_percent: parsed.data.default_markup_percent,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/estimates/rates`);
  return { ok: true, id };
}

export async function deleteSavedRateOnWeb(
  id: string,
): Promise<SavedRateActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can manage rates.' };
  }
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from('saved_rates')
    .select('tenant_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing || existing.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  // Hard delete is safe: estimate_line_items.saved_rate_id is ON DELETE SET
  // NULL, so existing quotes keep their captured values.
  const { error } = await supabase.from('saved_rates').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/estimates/rates`);
  return { ok: true };
}
