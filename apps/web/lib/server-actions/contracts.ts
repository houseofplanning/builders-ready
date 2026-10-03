'use server';

import { revalidatePath } from 'next/cache';
import { contractCreate, milestoneAmountPence } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface ContractActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function nextInvoiceNumber(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from('invoices')
    .select('number')
    .eq('tenant_id', tenantId)
    .like('number', `${prefix}%`)
    .order('number', { ascending: false })
    .limit(1);
  let n = 1;
  if (data && data[0]) {
    const m = (data[0].number as string).match(/-(\d+)$/);
    if (m) n = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${n.toString().padStart(3, '0')}`;
}

/**
 * Create or replace a project's (draft) contract and its payment schedule.
 * Only draft contracts can be edited; once sent/signed it's locked.
 */
export async function upsertContractOnWeb(
  raw: Record<string, unknown>,
): Promise<ContractActionResult> {
  const parsed = contractCreate.safeParse(raw);
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
    return { ok: false, error: 'Only owners and PMs can set up contracts.' };
  }
  const supabase = await createSupabaseServer();
  const d = parsed.data;

  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id')
    .eq('id', d.project_id)
    .maybeSingle();
  if (!project || project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised for this project.' };
  }

  const { data: existing } = await supabase
    .from('contracts')
    .select('id, status')
    .eq('project_id', d.project_id)
    .maybeSingle();
  if (existing && existing.status !== 'draft') {
    return { ok: false, error: 'This contract has been sent and can no longer be edited.' };
  }

  let contractId = existing?.id as string | undefined;
  if (contractId) {
    const { error } = await supabase
      .from('contracts')
      .update({
        contract_sum_pence: d.contract_sum_pence,
        terms: d.terms ?? null,
        retention_percent: d.retention_percent,
      })
      .eq('id', contractId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: row, error } = await supabase
      .from('contracts')
      .insert({
        tenant_id: tenant.tenant.id,
        project_id: d.project_id,
        created_by: tenant.user_id,
        contract_sum_pence: d.contract_sum_pence,
        terms: d.terms ?? null,
        retention_percent: d.retention_percent,
        status: 'draft',
      })
      .select('id')
      .single();
    if (error || !row) return { ok: false, error: error?.message ?? 'Insert failed.' };
    contractId = row.id as string;
  }

  // Replace milestones wholesale.
  await supabase.from('payment_milestones').delete().eq('contract_id', contractId);
  const rows = d.milestones.map((m, i) => ({
    tenant_id: tenant.tenant.id,
    contract_id: contractId,
    project_id: d.project_id,
    position: i,
    name: m.name,
    percent: m.percent ?? null,
    amount_pence: m.amount_pence ?? null,
    is_retention: m.is_retention,
  }));
  const { error: mErr } = await supabase.from('payment_milestones').insert(rows);
  if (mErr) return { ok: false, error: mErr.message };

  revalidatePath(`/${tenant.tenant.slug}/projects/${d.project_id}`);
  return { ok: true, id: contractId };
}

export async function sendContractOnWeb(
  contractId: string,
): Promise<ContractActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can send contracts.' };
  }
  const supabase = await createSupabaseServer();
  const { data: c } = await supabase
    .from('contracts')
    .select('tenant_id, project_id, status')
    .eq('id', contractId)
    .maybeSingle();
  if (!c || c.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  if (c.status === 'signed') {
    return { ok: false, error: 'Already signed.' };
  }
  const { error } = await supabase
    .from('contracts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', contractId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${c.project_id}`);
  return { ok: true };
}

export async function deleteContractOnWeb(
  contractId: string,
): Promise<ContractActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Not authorised.' };
  }
  const supabase = await createSupabaseServer();
  const { data: c } = await supabase
    .from('contracts')
    .select('tenant_id, project_id, status')
    .eq('id', contractId)
    .maybeSingle();
  if (!c || c.tenant_id !== tenant.tenant.id) return { ok: false, error: 'Not found.' };
  if (c.status === 'signed') {
    return { ok: false, error: 'A signed contract cannot be deleted.' };
  }
  const { error } = await supabase.from('contracts').delete().eq('id', contractId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${c.project_id}`);
  return { ok: true };
}

/** Client signs the contract (name captured as the signature). */
export async function signContractOnWeb(
  contractId: string,
  fullName: string,
): Promise<ContractActionResult> {
  const name = (fullName ?? '').trim();
  if (name.length < 2) return { ok: false, error: 'Type your name to sign.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  const supabase = await createSupabaseServer();
  const { data: c } = await supabase
    .from('contracts')
    .select('tenant_id, project_id, status')
    .eq('id', contractId)
    .maybeSingle();
  if (!c || c.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not found.' };
  }
  if (c.status === 'signed') return { ok: true };
  // RLS (contracts_client_sign) enforces the caller is the project's client
  // and that signed_by = auth.uid().
  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'signed',
      client_signature: name,
      signed_at: new Date().toISOString(),
      signed_by: tenant.user_id,
    })
    .eq('id', contractId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${c.project_id}`);
  return { ok: true };
}

/** Raise an invoice for a milestone (reuses the invoices feature). */
export async function raiseMilestoneInvoiceOnWeb(
  milestoneId: string,
): Promise<ContractActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can raise invoices.' };
  }
  const supabase = await createSupabaseServer();

  const { data: m } = await supabase
    .from('payment_milestones')
    .select('id, tenant_id, project_id, contract_id, name, percent, amount_pence, invoice_id')
    .eq('id', milestoneId)
    .maybeSingle();
  if (!m || m.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Milestone not found.' };
  }
  if (m.invoice_id) {
    return { ok: false, error: 'An invoice has already been raised for this milestone.' };
  }
  const { data: contract } = await supabase
    .from('contracts')
    .select('contract_sum_pence')
    .eq('id', m.contract_id)
    .maybeSingle();
  if (!contract) return { ok: false, error: 'Contract not found.' };

  const amount = milestoneAmountPence(Number(contract.contract_sum_pence), {
    percent: m.percent != null ? Number(m.percent) : null,
    amount_pence: m.amount_pence != null ? Number(m.amount_pence) : null,
  });
  if (amount <= 0) return { ok: false, error: 'Milestone amount is zero.' };

  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextInvoiceNumber(supabase, tenant.tenant.id);
    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenant.tenant.id,
        project_id: m.project_id,
        created_by: tenant.user_id,
        number,
        title: m.name,
        amount_gbp_pence: amount,
        issued_at: today,
        due_at: due,
        status: 'sent',
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') continue;
      return { ok: false, error: error.message };
    }
    const { error: linkErr } = await supabase
      .from('payment_milestones')
      .update({ invoice_id: inv.id })
      .eq('id', milestoneId);
    if (linkErr) return { ok: false, error: linkErr.message };

    revalidatePath(`/${tenant.tenant.slug}/projects/${m.project_id}`);
    return { ok: true, id: inv.id as string };
  }
  return { ok: false, error: 'Could not pick a unique invoice number. Try again.' };
}
