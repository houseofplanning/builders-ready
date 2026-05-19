import { supabase } from './supabase';
import type { Invoice, Profile, UUID } from '@br/shared';

/**
 * Data helpers for the Invoices feature. Defensive multi-query pattern
 * (no PostgREST embeds) — same reasoning as decisions.ts / variations.ts.
 *
 * Invoice statuses (from the schema enum):
 *   draft     — saved by PM, not yet visible to client
 *   sent      — visible, awaiting payment
 *   paid      — marked paid by client (or PM/owner on their behalf)
 *   overdue   — past due_at and still unpaid (computed client-side; the
 *               enum exists but we don't auto-flip server-side yet)
 *   cancelled — withdrawn by PM
 *
 * "Outstanding" on the UI = status in (sent, overdue) — i.e. clients
 * still owe this money.
 */

export interface InvoiceListItem {
  id: UUID;
  number: string;
  title: string;
  amount_gbp_pence: number;
  issued_at: string;
  due_at: string;
  status: Invoice['status'];
  /** Computed: true if status === 'sent' AND due_at < today. */
  isOverdueVisual: boolean;
  paid_at: string | null;
  paid_reference: string | null;
  created_by_name: string;
}

export interface InvoiceDetail extends Invoice {
  created_by_profile: Pick<Profile, 'id' | 'full_name'>;
  paid_marked_by_profile: Pick<Profile, 'id' | 'full_name'> | null;
}

function isVisuallyOverdue(invoice: { status: Invoice['status']; due_at: string }): boolean {
  if (invoice.status !== 'sent') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.due_at + 'T00:00:00');
  return due.getTime() < today.getTime();
}

export async function listInvoicesForProject(
  projectId: UUID,
): Promise<InvoiceListItem[]> {
  const { data: rows, error } = await supabase
    .from('invoices')
    .select(
      'id, number, title, amount_gbp_pence, issued_at, due_at, status, paid_at, paid_reference, created_by',
    )
    .eq('project_id', projectId)
    .order('issued_at', { ascending: false });
  if (error || !rows || rows.length === 0) return [];

  const ids = new Set<string>();
  rows.forEach((r) => {
    if (r.created_by) ids.add(r.created_by);
  });
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(ids));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.full_name as string]),
  );

  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    amount_gbp_pence: Number(r.amount_gbp_pence),
    issued_at: r.issued_at,
    due_at: r.due_at,
    status: r.status,
    isOverdueVisual: isVisuallyOverdue(r),
    paid_at: r.paid_at,
    paid_reference: r.paid_reference,
    created_by_name: profileMap.get(r.created_by) ?? 'Someone',
  }));
}

export async function getInvoice(id: UUID): Promise<InvoiceDetail | null> {
  const { data: row, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return null;

  const profileIds = [row.created_by, row.paid_marked_by].filter(
    (v): v is string => !!v,
  );
  const { data: profiles } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds)
    : { data: [] as { id: string; full_name: string }[] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { id: p.id, full_name: p.full_name },
    ]),
  );

  return {
    ...(row as Invoice),
    created_by_profile:
      profileMap.get(row.created_by) ?? {
        id: row.created_by,
        full_name: 'Someone',
      },
    paid_marked_by_profile: row.paid_marked_by
      ? profileMap.get(row.paid_marked_by) ?? null
      : null,
  };
}

/**
 * Pick the next sequential invoice number for a tenant, scoped to the
 * current calendar year. Format: INV-YYYY-NNN.
 */
export async function nextInvoiceNumber(tenantId: UUID): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from('invoices')
    .select('number')
    .eq('tenant_id', tenantId)
    .like('number', `${prefix}%`)
    .order('number', { ascending: false })
    .limit(1);
  let nextSeq = 1;
  if (data && data[0]) {
    const match = (data[0].number as string).match(/-(\d+)$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${nextSeq.toString().padStart(3, '0')}`;
}

export interface CreateInvoiceInput {
  tenant_id: UUID;
  project_id: UUID;
  created_by: UUID;
  title: string;
  description: string | null;
  amount_gbp_pence: number;
  issued_at: string;
  due_at: string;
  /** Override auto-numbering — useful if the builder has an existing
   *  sequence. Leave null to use the next INV-YYYY-NNN. */
  number_override: string | null;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<UUID> {
  // Retry up to 3 times on number collision (only matters if auto-numbered
  // and two PMs hit the same second).
  for (let attempt = 0; attempt < 3; attempt++) {
    const number =
      input.number_override ?? (await nextInvoiceNumber(input.tenant_id));
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        tenant_id: input.tenant_id,
        project_id: input.project_id,
        created_by: input.created_by,
        number,
        title: input.title,
        description: input.description,
        amount_gbp_pence: input.amount_gbp_pence,
        issued_at: input.issued_at,
        due_at: input.due_at,
        status: 'sent' as Invoice['status'],
      })
      .select('id')
      .single();
    if (!error && data) return data.id;
    if (error?.code !== '23505' || input.number_override) {
      throw new Error(error?.message ?? 'Failed to create invoice.');
    }
  }
  throw new Error('Could not pick a unique invoice number. Try again.');
}

export interface MarkPaidInput {
  invoice_id: UUID;
  paid_reference: string | null;
  paid_marked_by: UUID;
}

export async function markInvoicePaid(input: MarkPaidInput): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_reference: input.paid_reference?.trim() || null,
      paid_marked_by: input.paid_marked_by,
    })
    .eq('id', input.invoice_id);
  if (error) throw new Error(error.message);
}
