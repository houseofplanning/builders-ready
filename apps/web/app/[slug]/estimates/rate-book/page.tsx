import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { RateBookManager, type RbMaterial, type RbLabour } from './rate-book-manager';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RateBookPage({ params }: Props) {
  const { slug } = await params;
  const { role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/estimates`);

  const supabase = await createSupabaseServer();
  const [matRes, labRes, matOvrRes, labOvrRes] = await Promise.all([
    supabase
      .from('material_items')
      .select('code, name, trade_category, unit, base_unit_cost_pence')
      .eq('active', true)
      .order('trade_category', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('labour_rates')
      .select('trade, unit, base_rate_pence')
      .eq('active', true)
      .order('trade', { ascending: true }),
    supabase.from('tenant_material_prices').select('material_code, unit_cost_pence'),
    supabase.from('tenant_labour_rates').select('trade, unit, rate_pence'),
  ]);

  const matOvr = new Map(
    (matOvrRes.data ?? []).map((r) => [r.material_code as string, Number(r.unit_cost_pence)]),
  );
  const labOvr = new Map(
    (labOvrRes.data ?? []).map((r) => [`${r.trade}|${r.unit}`, Number(r.rate_pence)]),
  );

  const materials: RbMaterial[] = (matRes.data ?? []).map((m) => ({
    code: m.code as string,
    name: m.name as string,
    trade_category: (m.trade_category as string | null) ?? 'Other',
    unit: m.unit as string,
    default_pence: Number(m.base_unit_cost_pence),
    override_pence: matOvr.get(m.code as string) ?? null,
  }));
  const labour: RbLabour[] = (labRes.data ?? []).map((l) => ({
    trade: l.trade as string,
    unit: l.unit as string,
    default_pence: Number(l.base_rate_pence),
    override_pence: labOvr.get(`${l.trade}|${l.unit}`) ?? null,
  }));

  return (
    <div>
      <header className="mb-6">
        <Link
          href={`/${slug}/estimates`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Quotes
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Your rate book</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Set your own prices and they&apos;ll be used in every template quote, on the
          app and the web, in place of our suggested figures. Leave a box blank to keep
          our price.
        </p>
      </header>
      <RateBookManager slug={slug} initialMaterials={materials} initialLabour={labour} />
    </div>
  );
}
