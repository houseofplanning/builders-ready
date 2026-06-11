'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isoDate } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface InvoiceActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const invoiceCreateSchema = z.object({
  project_id: z.string().uuid(),
  number: z.string().min(1).max(40),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).nullable().optional(),
  amount_gbp_pence: z.number().int().positive(),
  issued_at: isoDate,
  due_at: isoDate,
  status: z.enum(['draft', 'sent']).default('sent'),
});

export async function createInvoiceOnWeb(
  raw: Record<string, unknown>,
): Promise<InvoiceActionResult> {
  const parsed = invoiceCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can create invoices.' };
  }
  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id, tenant_id')
    .eq('id', parsed.data.project_id)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };
  if (project.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised for this project.' };
  }

  const { data: row, error } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenant.tenant.id,
      project_id: parsed.data.project_id,
      issued_by: tenant.user_id,
      number: parsed.data.number,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      amount_gbp_pence: parsed.data.amount_gbp_pence,
      issued_at: parsed.data.issued_at,
      due_at: parsed.data.due_at,
      status: parsed.data.status,
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Insert failed.' };

  revalidatePath(`/${tenant.tenant.slug}/projects/${parsed.data.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true, id: row.id };
}

const markPaidSchema = z.object({
  invoice_id: z.string().uuid(),
  paid_reference: z.string().max(120).nullable().optional(),
});

export async function markInvoicePaid(
  raw: Record<string, unknown>,
): Promise<InvoiceActionResult> {
  const parsed = markPaidSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can mark invoices paid.' };
  }
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from('invoices')
    .select('project_id, tenant_id')
    .eq('id', parsed.data.invoice_id)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Invoice not found.' };
  if (existing.tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'Not authorised.' };
  }
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_reference: parsed.data.paid_reference ?? null,
    })
    .eq('id', parsed.data.invoice_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${existing.project_id}`);
  revalidatePath(`/${tenant.tenant.slug}/dashboard`);
  return { ok: true };
}
