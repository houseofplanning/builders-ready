'use server';

import { revalidatePath } from 'next/cache';
import type { ResourceKind, RateUnit } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface ActionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface ResourceInput {
  id?: string;
  kind: ResourceKind;
  display_name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  cost_rate_pence: number | null;
  cost_rate_unit: RateUnit;
  on_cost_percent: number;
  engaged_from: string | null;
  engaged_to: string | null;
}

async function ownerOrPm() {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { error: 'Not signed in.' as const };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { error: 'Only owners and PMs can manage the team.' as const };
  }
  return { tenant };
}

/** Create or update a resource (team member or subcontractor). Owner/PM only. */
export async function saveResource(input: ResourceInput): Promise<ActionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;

  const name = input.display_name.trim();
  if (!name) return { ok: false, error: 'A name is required.' };

  const supabase = await createSupabaseServer();
  const row = {
    tenant_id: tenant.tenant.id,
    kind: input.kind,
    display_name: name,
    trade: input.trade?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    cost_rate_pence:
      input.cost_rate_pence != null && Number.isFinite(input.cost_rate_pence)
        ? Math.max(0, Math.round(input.cost_rate_pence))
        : null,
    cost_rate_unit: input.cost_rate_unit,
    on_cost_percent: Math.min(200, Math.max(0, Number(input.on_cost_percent) || 0)),
    // Engagement window only applies to subcontractors.
    engaged_from: input.kind === 'subcontractor' ? input.engaged_from || null : null,
    engaged_to: input.kind === 'subcontractor' ? input.engaged_to || null : null,
    updated_at: new Date().toISOString(),
  };

  let id = input.id;
  if (id) {
    const { error } = await supabase.from('resources').update(row).eq('id', id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('resources')
      .insert(row)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    id = (data as { id: string } | null)?.id;
  }

  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  return { ok: true, id };
}

/** Archive (soft-delete) a resource so it drops off the roster but history stays. */
export async function archiveResource(id: string): Promise<ActionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('resources')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  return { ok: true };
}

export interface DocumentInput {
  resource_id: string;
  doc_type: string;
  reference: string | null;
  issued_on: string | null;
  expires_on: string | null;
}

/** Add a certification/document record to a resource. Owner/PM only. */
export async function addResourceDocument(input: DocumentInput): Promise<ActionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  if (!input.doc_type.trim()) return { ok: false, error: 'Pick a document type.' };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('resource_documents')
    .insert({
      tenant_id: tenant.tenant.id,
      resource_id: input.resource_id,
      doc_type: input.doc_type.trim(),
      reference: input.reference?.trim() || null,
      issued_on: input.issued_on || null,
      expires_on: input.expires_on || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  return { ok: true, id: (data as { id: string } | null)?.id };
}

export async function deleteResourceDocument(id: string): Promise<ActionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('resource_documents').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  return { ok: true };
}
