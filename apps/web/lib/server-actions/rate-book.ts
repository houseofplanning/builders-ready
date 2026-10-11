'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface RateBookResult {
  ok: boolean;
  error?: string;
}

export interface MaterialEdit {
  code: string;
  /** Pence; null clears the override (reverts to the platform price). */
  unit_cost_pence: number | null;
}
export interface LabourEdit {
  trade: string;
  unit: string;
  rate_pence: number | null;
}

/**
 * Save a builder's own prices. A numeric value upserts an override; null
 * deletes it (back to the platform default). Owner/PM only; RLS also enforces.
 */
export async function saveTenantRateBook(input: {
  materials: MaterialEdit[];
  labour: LabourEdit[];
}): Promise<RateBookResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can set prices.' };
  }
  const supabase = await createSupabaseServer();
  const tenantId = tenant.tenant.id;

  const matUpserts = input.materials
    .filter((m) => m.unit_cost_pence != null && Number.isFinite(m.unit_cost_pence))
    .map((m) => ({
      tenant_id: tenantId,
      material_code: m.code,
      unit_cost_pence: Math.max(0, Math.round(m.unit_cost_pence as number)),
      updated_at: new Date().toISOString(),
    }));
  const matClears = input.materials.filter((m) => m.unit_cost_pence == null).map((m) => m.code);

  const labUpserts = input.labour
    .filter((l) => l.rate_pence != null && Number.isFinite(l.rate_pence))
    .map((l) => ({
      tenant_id: tenantId,
      trade: l.trade,
      unit: l.unit,
      rate_pence: Math.max(0, Math.round(l.rate_pence as number)),
      updated_at: new Date().toISOString(),
    }));
  const labClears = input.labour.filter((l) => l.rate_pence == null);

  if (matUpserts.length) {
    const { error } = await supabase
      .from('tenant_material_prices')
      .upsert(matUpserts, { onConflict: 'tenant_id,material_code' });
    if (error) return { ok: false, error: error.message };
  }
  if (matClears.length) {
    const { error } = await supabase
      .from('tenant_material_prices')
      .delete()
      .eq('tenant_id', tenantId)
      .in('material_code', matClears);
    if (error) return { ok: false, error: error.message };
  }
  if (labUpserts.length) {
    const { error } = await supabase
      .from('tenant_labour_rates')
      .upsert(labUpserts, { onConflict: 'tenant_id,trade,unit' });
    if (error) return { ok: false, error: error.message };
  }
  for (const l of labClears) {
    const { error } = await supabase
      .from('tenant_labour_rates')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('trade', l.trade)
      .eq('unit', l.unit);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/${tenant.tenant.slug}/estimates/rate-book`);
  revalidatePath(`/${tenant.tenant.slug}/estimates/templates`);
  return { ok: true };
}
