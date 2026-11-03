import { supabase } from './supabase';
import { milestoneAmountPence, type Invoice, type Profile, type UUID } from '@br/shared';

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
  // due_at may be a date ('YYYY-MM-DD') or a full ISO timestamp — take the date
  // part so appending 'T00:00:00' always yields a valid Date.
  const due = new Date(String(invoice.due_at).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(due.getTime())) return false;
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
  // Compute the max sequence numerically — a string sort breaks once the
  // sequence passes 999 ("...-1000" sorts before "...-999"), which could
  // collide/repeat a legal invoice number.
  const { data } = await supabase
    .from('invoices')
    .select('number')
    .eq('tenant_id', tenantId)
    .like('number', `${prefix}%`);
  let maxSeq = 0;
  for (const row of data ?? []) {
    const match = (row.number as string).match(/-(\d+)$/);
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
  }
  return `${prefix}${(maxSeq + 1).toString().padStart(3, '0')}`;
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
  /** Which payment methods the client may use for this invoice. Default all
   *  on (card shows only once Stripe is connected). */
  allow_card?: boolean;
  allow_bank_transfer?: boolean;
  allow_cash?: boolean;
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
        allow_card: input.allow_card ?? true,
        allow_bank_transfer: input.allow_bank_transfer ?? true,
        allow_cash: input.allow_cash ?? true,
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

/**
 * Raise an invoice against a contract payment milestone — the mobile twin of
 * the web "Raise invoice" action on the payment schedule. The amount comes
 * from the contract (percent of sum, or a fixed amount), the invoice is
 * linked back to the milestone (so the contract schedule shows Invoiced /
 * Paid), and the client is notified by the DB trigger like any other invoice.
 */
export async function raiseMilestoneInvoice(
  milestoneId: UUID,
  createdBy: UUID,
  methods?: {
    allow_card?: boolean;
    allow_bank_transfer?: boolean;
    allow_cash?: boolean;
  },
): Promise<UUID> {
  const { data: m, error: mErr } = await supabase
    .from('payment_milestones')
    .select('id, tenant_id, project_id, contract_id, name, percent, amount_pence, invoice_id')
    .eq('id', milestoneId)
    .maybeSingle();
  if (mErr || !m) throw new Error(mErr?.message ?? 'Milestone not found.');
  if (m.invoice_id) {
    throw new Error('An invoice has already been raised for this milestone.');
  }

  const { data: contract, error: cErr } = await supabase
    .from('contracts')
    .select('contract_sum_pence')
    .eq('id', m.contract_id)
    .maybeSingle();
  if (cErr || !contract) throw new Error(cErr?.message ?? 'Contract not found.');

  const amount = milestoneAmountPence(Number(contract.contract_sum_pence), {
    percent: m.percent != null ? Number(m.percent) : null,
    amount_pence: m.amount_pence != null ? Number(m.amount_pence) : null,
  });
  if (amount <= 0) throw new Error('This milestone has a zero amount.');

  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextInvoiceNumber(m.tenant_id);
    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({
        tenant_id: m.tenant_id,
        project_id: m.project_id,
        created_by: createdBy,
        number,
        title: m.name,
        amount_gbp_pence: amount,
        issued_at: today,
        due_at: due,
        status: 'sent' as Invoice['status'],
        allow_card: methods?.allow_card ?? true,
        allow_bank_transfer: methods?.allow_bank_transfer ?? true,
        allow_cash: methods?.allow_cash ?? true,
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') continue;
      throw new Error(error.message);
    }
    const { error: linkErr } = await supabase
      .from('payment_milestones')
      .update({ invoice_id: inv.id })
      .eq('id', milestoneId);
    if (linkErr) throw new Error(linkErr.message);
    return inv.id as UUID;
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

/**
 * Ask the web backend to email the client a PDF receipt for a paid invoice.
 * The web mark-paid path emails directly; the app has no PDF/email runtime, so
 * it calls this JWT-authenticated endpoint. Best-effort — never throws, so it
 * can't disrupt the confirm flow.
 */
export async function requestPaidReceiptEmail(invoiceId: UUID): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const base = process.env.EXPO_PUBLIC_APP_URL ?? 'https://buildersready.uk';
    await fetch(`${base}/api/invoices/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
  } catch {
    // Best-effort — the in-app/push receipt still fires via the DB trigger.
  }
}
