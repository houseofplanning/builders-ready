import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendPaidReceipt } from '@/lib/receipts';

/**
 * Emails the client a PDF receipt for a paid invoice. Called by the mobile app
 * right after a builder confirms a cash / bank-transfer payment, so the emailed
 * receipt fires from the app path too (the web mark-paid action calls
 * sendPaidReceipt directly). Authenticated by the caller's Supabase access
 * token — only an owner/PM of the invoice's tenant may trigger it.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 401 });
  }

  let invoiceId: string | undefined;
  try {
    const body = (await req.json()) as { invoice_id?: string };
    invoiceId = body.invoice_id;
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
  if (!invoiceId) {
    return NextResponse.json({ ok: false, error: 'Missing invoice_id' }, { status: 400 });
  }

  // Validate the caller's token → user.
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  // Authorise: the user must be an owner/PM of the invoice's tenant.
  const admin = getSupabaseAdmin();
  const { data: inv } = await admin
    .from('invoices')
    .select('tenant_id')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) {
    return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });
  }
  const { data: member } = await admin
    .from('tenant_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', inv.tenant_id)
    .maybeSingle();
  if (!member || (member.role !== 'owner' && member.role !== 'pm')) {
    return NextResponse.json({ ok: false, error: 'Not authorised' }, { status: 403 });
  }

  const sent = await sendPaidReceipt(invoiceId);
  return NextResponse.json({ ok: true, emailed: sent });
}
