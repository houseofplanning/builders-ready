import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type {
  SavedRate,
  QuoteTemplate,
  PriceBook,
  MaterialItem,
  LabourRate,
  TemplateField,
  MaterialOverride,
  LabourOverride,
} from '@br/shared';
import { mergePriceBook } from '@br/shared';
import { TemplateQuoteBuilder } from './template-quote-builder';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EstimateTemplatesPage({ params }: Props) {
  const { slug } = await params;
  const { role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/estimates`);

  const supabase = await createSupabaseServer();
  const [tplRes, matRes, labRes, rateRes, matOvrRes, labOvrRes] = await Promise.all([
    supabase
      .from('quote_templates')
      .select(
        'id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, basis',
      )
      .eq('active', true)
      .order('name', { ascending: true }),
    supabase
      .from('material_items')
      .select(
        'code, name, category, trade_category, unit, base_unit_cost_pence, coverage_m2_per_litre, source, priced_on',
      )
      .eq('active', true),
    supabase
      .from('labour_rates')
      .select('trade, unit, base_rate_pence, source, priced_on')
      .eq('active', true),
    supabase
      .from('saved_rates')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true }),
    supabase.from('tenant_material_prices').select('material_code, unit_cost_pence, updated_at'),
    supabase.from('tenant_labour_rates').select('trade, unit, rate_pence, updated_at'),
  ]);

  const templates: QuoteTemplate[] = (tplRes.data ?? []).map((r) => ({
    id: r.id as string,
    key: r.key as string,
    name: r.name as string,
    summary: (r.summary as string | null) ?? null,
    trade_category: (r.trade_category as string | null) ?? null,
    project_type: (r.project_type as string | null) ?? null,
    engine_key: r.engine_key as string,
    inputs_schema: (Array.isArray(r.inputs_schema)
      ? r.inputs_schema
      : []) as TemplateField[],
    version: Number(r.version),
    basis: r.basis === 'indicative' ? 'indicative' : 'measured',
  }));

  const materialOverrides: MaterialOverride[] = (matOvrRes.data ?? []).map((r) => ({
    code: r.material_code as string,
    unit_cost_pence: Number(r.unit_cost_pence),
    priced_on: String(r.updated_at).slice(0, 10),
  }));
  const labourOverrides: LabourOverride[] = (labOvrRes.data ?? []).map((r) => ({
    trade: r.trade as string,
    unit: r.unit as string,
    base_rate_pence: Number(r.rate_pence),
    priced_on: String(r.updated_at).slice(0, 10),
  }));

  const basePriceBook: PriceBook = {
    materials: (matRes.data ?? []).map(
      (m): MaterialItem => ({
        code: m.code as string,
        name: m.name as string,
        category: m.category as string,
        trade_category: (m.trade_category as string | null) ?? null,
        unit: m.unit as string,
        base_unit_cost_pence: Number(m.base_unit_cost_pence),
        coverage_m2_per_litre:
          m.coverage_m2_per_litre == null ? null : Number(m.coverage_m2_per_litre),
        source: (m.source as string | null) ?? null,
        priced_on: m.priced_on as string,
      }),
    ),
    labour: (labRes.data ?? []).map(
      (l): LabourRate => ({
        trade: l.trade as string,
        unit: l.unit as string,
        base_rate_pence: Number(l.base_rate_pence),
        source: (l.source as string | null) ?? null,
        priced_on: l.priced_on as string,
      }),
    ),
  };
  const priceBook = mergePriceBook(basePriceBook, materialOverrides, labourOverrides);

  return (
    <div>
      <header className="mb-6">
        <Link
          href={`/${slug}/estimates`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Quotes
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Start from a template
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Answer a few questions and we&apos;ll build a costed draft with suggested,
          data-grounded prices. Every figure stays editable, and you add your margin
          on top.{' '}
          <Link href={`/${slug}/estimates/rate-book`} className="font-semibold text-primary hover:underline">
            Set your own prices →
          </Link>
        </p>
      </header>
      <TemplateQuoteBuilder
        slug={slug}
        templates={templates}
        priceBook={priceBook}
        savedRates={(rateRes.data ?? []) as SavedRate[]}
      />
    </div>
  );
}
