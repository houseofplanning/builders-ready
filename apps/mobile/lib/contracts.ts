import { supabase } from './supabase';
import { milestoneAmountPence, summariseSchedule } from '@br/shared';
import type { ContractStatus, UUID } from '@br/shared';

/**
 * Contract & payment-schedule helpers for mobile.
 *
 * The contract is built on web (owner/PM). On mobile the client reviews and
 * e-signs it, and both parties see the schedule and status. Everyone with
 * project access can read (RLS: has_project_access); only the project's client
 * can move it to 'signed' (RLS: contracts_client_sign).
 */

export interface ContractMilestone {
  id: UUID;
  name: string;
  percent: number | null;
  amount_pence: number | null;
  is_retention: boolean;
  invoice_id: UUID | null;
  invoice_status: string | null;
  /** Resolved £ amount against the contract sum. */
  amount_resolved_pence: number;
}

export interface ProjectContract {
  id: UUID;
  contract_sum_pence: number;
  terms: string | null;
  retention_percent: number;
  status: ContractStatus;
  sent_at: string | null;
  signed_at: string | null;
  client_signature: string | null;
  milestones: ContractMilestone[];
  scheduled_total_pence: number;
  retention_pence: number;
  /** Builder's Stripe Connect account can accept payments — show "Pay". */
  payments_enabled: boolean;
}

export async function getContract(
  projectId: UUID,
): Promise<ProjectContract | null> {
  const { data: c } = await supabase
    .from('contracts')
    .select(
      'id, tenant_id, contract_sum_pence, terms, retention_percent, status, sent_at, signed_at, client_signature',
    )
    .eq('project_id', projectId)
    .maybeSingle();
  if (!c) return null;

  // Can the builder accept online payments yet?
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('connect_charges_enabled')
    .eq('id', c.tenant_id)
    .maybeSingle();
  const payments_enabled = !!tenantRow?.connect_charges_enabled;

  const { data: ms } = await supabase
    .from('payment_milestones')
    .select('id, name, percent, amount_pence, is_retention, invoice_id, position')
    .eq('project_id', projectId)
    .order('position');

  const sum = Number(c.contract_sum_pence);

  // Resolve linked invoice statuses in one round-trip.
  const invoiceIds = (ms ?? [])
    .map((m) => m.invoice_id)
    .filter((x): x is string => !!x);
  const statusById = new Map<string, string>();
  if (invoiceIds.length) {
    const { data: invs } = await supabase
      .from('invoices')
      .select('id, status')
      .in('id', invoiceIds);
    (invs ?? []).forEach((i) => statusById.set(i.id, i.status));
  }

  const milestones: ContractMilestone[] = (ms ?? []).map((m) => {
    const percent = m.percent != null ? Number(m.percent) : null;
    const amount_pence = m.amount_pence != null ? Number(m.amount_pence) : null;
    return {
      id: m.id,
      name: m.name,
      percent,
      amount_pence,
      is_retention: m.is_retention,
      invoice_id: m.invoice_id,
      invoice_status: m.invoice_id
        ? statusById.get(m.invoice_id) ?? 'sent'
        : null,
      amount_resolved_pence: milestoneAmountPence(sum, { percent, amount_pence }),
    };
  });

  const summary = summariseSchedule(
    sum,
    milestones.map((m) => ({
      percent: m.percent,
      amount_pence: m.amount_pence,
      is_retention: m.is_retention,
    })),
  );

  return {
    id: c.id,
    contract_sum_pence: sum,
    terms: c.terms,
    retention_percent: Number(c.retention_percent),
    status: c.status as ContractStatus,
    sent_at: c.sent_at,
    signed_at: c.signed_at,
    client_signature: c.client_signature,
    milestones,
    scheduled_total_pence: summary.scheduled_total_pence,
    retention_pence: summary.retention_pence,
    payments_enabled,
  };
}

/** Client signs the contract. RLS enforces caller = project client & signed_by = uid. */
export async function signContract(
  contractId: UUID,
  fullName: string,
  userId: UUID,
): Promise<void> {
  const name = fullName.trim();
  if (name.length < 2) throw new Error('Type your full name to sign.');
  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'signed',
      client_signature: name,
      signed_at: new Date().toISOString(),
      signed_by: userId,
    })
    .eq('id', contractId);
  if (error) throw new Error(error.message);
}

/** Owner/PM sends a draft contract to the client for signature. */
export async function sendContract(contractId: UUID): Promise<void> {
  const { error } = await supabase
    .from('contracts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', contractId);
  if (error) throw new Error(error.message);
}
