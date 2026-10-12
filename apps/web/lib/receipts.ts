import 'server-only';
import { gbp, formatDate } from '@br/shared';
import { getSupabaseAdmin } from './supabase-admin';
import { renderReceiptPdfBuffer } from './pdf/receipt';
import { sendInvoicePaidReceiptEmail } from './email';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank transfer',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  manual: 'Manual',
};

/**
 * Email the client a PDF receipt for a paid invoice. One implementation used
 * by every confirm path — the web mark-paid server action and the mobile
 * confirm (via /api/invoices/receipt) — so a receipt is emailed exactly once
 * no matter where the builder confirms. Best-effort: never throws, so a mail /
 * PDF hiccup can't break the caller. Card payments get Stripe's own receipt,
 * so those are skipped here.
 *
 * Returns true if an email was sent.
 */
export async function sendPaidReceipt(invoiceId: string): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const { data: inv } = await admin
      .from('invoices')
      .select('number, title, amount_gbp_pence, status, paid_at, paid_via, paid_reference, project_id, tenant_id')
      .eq('id', invoiceId)
      .maybeSingle();
    if (!inv || inv.status !== 'paid') return false;
    if (inv.paid_via === 'card') return false; // Stripe emails its own receipt

    const [{ data: proj }, { data: t }] = await Promise.all([
      admin.from('projects').select('name, client_id').eq('id', inv.project_id).maybeSingle(),
      admin
        .from('tenants')
        .select('name, brand_primary, business_email, business_phone, vat_number, company_number')
        .eq('id', inv.tenant_id)
        .maybeSingle(),
    ]);
    if (!t || !proj?.client_id) return false;
    const { data: cp } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', proj.client_id)
      .maybeSingle();
    if (!cp?.email) return false;

    const methodLabel = inv.paid_via ? METHOD_LABELS[inv.paid_via] ?? 'Manual' : 'Manual';
    const pdf = await renderReceiptPdfBuffer({
      businessName: t.name,
      brandPrimary: t.brand_primary,
      businessEmail: t.business_email,
      businessPhone: t.business_phone,
      vatNumber: t.vat_number,
      companyNumber: t.company_number,
      clientName: cp.full_name ?? null,
      projectName: proj.name ?? null,
      invoiceNumber: inv.number,
      invoiceTitle: inv.title,
      amountPence: Number(inv.amount_gbp_pence),
      paidAt: inv.paid_at,
      method: inv.paid_via,
      reference: inv.paid_reference,
    });
    await sendInvoicePaidReceiptEmail({
      to: cp.email,
      businessName: t.name,
      clientName: cp.full_name ?? null,
      invoiceNumber: inv.number,
      invoiceTitle: inv.title,
      amountLabel: gbp(Number(inv.amount_gbp_pence)),
      methodLabel,
      datePaidLabel: formatDate(inv.paid_at),
      pdf,
    });
    return true;
  } catch (e) {
    console.error('[receipt] email failed', e);
    return false;
  }
}
