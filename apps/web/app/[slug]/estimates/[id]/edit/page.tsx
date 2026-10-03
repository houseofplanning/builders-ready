import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { Estimate, EstimateLineItem, SavedRate } from '@br/shared';
import { EstimateForm, type EstimateFormInitial } from '../../estimate-form';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export default async function EditEstimatePage({ params }: Props) {
  const { slug, id } = await params;
  const { role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/estimates`);

  const supabase = await createSupabaseServer();
  const { data: estRow } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!estRow) notFound();
  const estimate = estRow as Estimate;
  if (estimate.status !== 'draft') redirect(`/${slug}/estimates/${id}`);

  const [{ data: lineRows }, { data: rates }] = await Promise.all([
    supabase
      .from('estimate_line_items')
      .select('*')
      .eq('estimate_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('saved_rates')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true }),
  ]);
  const lines = (lineRows ?? []) as EstimateLineItem[];

  const initial: EstimateFormInitial = {
    id: estimate.id,
    title: estimate.title,
    project_type: estimate.project_type ?? null,
    client_name: estimate.client_name,
    client_email: estimate.client_email,
    client_phone: estimate.client_phone,
    site_address_line1: estimate.site_address_line1,
    city: estimate.city,
    postcode: estimate.postcode,
    vat_mode: estimate.vat_mode,
    valid_until: estimate.valid_until,
    notes: estimate.notes,
    lines: lines.map((l) => ({
      kind: l.kind,
      saved_rate_id: l.saved_rate_id,
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      unit_cost_pence: Number(l.unit_cost_pence),
      markup_percent: Number(l.markup_percent),
    })),
  };

  return (
    <div>
      <header className="mb-6">
        <Link
          href={`/${slug}/estimates/${id}`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Back to quote
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Edit quote · {estimate.number}
        </h1>
      </header>
      <EstimateForm
        slug={slug}
        savedRates={(rates ?? []) as SavedRate[]}
        initial={initial}
      />
    </div>
  );
}
