'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface ForHireResult {
  ok: boolean;
  error?: string;
}

export interface ForHireInput {
  discoverable: boolean;
  day_rate_pence: number | null;
  day_rate_unit: 'day' | 'hour';
  trades: string[];
  service_area: string | null;
}

/**
 * Save the tenant's For Hire Profile — the "available for work" switch plus the
 * advertised rate, trades and area shown in the directory to other builders.
 * Owner only: this is the business's public listing and pricing.
 */
export async function saveForHireProfile(input: ForHireInput): Promise<ForHireResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner') {
    return { ok: false, error: 'Only the owner can change the For Hire profile.' };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('tenants')
    .update({
      discoverable: input.discoverable,
      day_rate_pence:
        input.day_rate_pence != null && Number.isFinite(input.day_rate_pence)
          ? Math.max(0, Math.round(input.day_rate_pence))
          : null,
      day_rate_unit: input.day_rate_unit === 'hour' ? 'hour' : 'day',
      for_hire_trades: input.trades.slice(0, 20),
      service_area: input.service_area?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenant.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${tenant.tenant.slug}/for-hire`);
  return { ok: true };
}

export interface ForHireJob {
  assignment_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  project_id: string;
  project_name: string;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  stage_name: string | null;
  business_tenant_id: string | null;
  business_name: string | null;
  business_phone: string | null;
}

/** Jobs other builders have hired this tenant for (the For Hire side). */
export async function listForHireWork(): Promise<{ ok: boolean; rows?: ForHireJob[] }> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.rpc('my_schedule');
  return { ok: true, rows: (data ?? []) as ForHireJob[] };
}

/** Confirm a for-hire booking (I'll be there). */
export async function confirmForHireJob(assignmentId: string): Promise<ForHireResult> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('confirm_my_assignment', { p_id: assignmentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
