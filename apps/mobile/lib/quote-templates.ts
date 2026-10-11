import { supabase } from './supabase';
import {
  generateQuoteFromTemplate,
  mergePriceBook,
  type QuoteTemplate,
  type MaterialItem,
  type LabourRate,
  type PriceBook,
  type GenerateResult,
  type MaterialOverride,
  type LabourOverride,
} from '@br/shared';
import type { EstimateLineDraft } from './estimates';

/**
 * Quote Templates v2 — mobile data layer.
 *
 * Loads the platform template catalogue + price book (material_items +
 * labour_rates) and runs the shared generator. The prices are data-grounded
 * and carry a `priced_on`, so the UI can show "priced as of <date>". The
 * builder edits any generated line and sets a single margin on top.
 */

export async function listQuoteTemplates(): Promise<QuoteTemplate[]> {
  const { data, error } = await supabase
    .from('quote_templates')
    .select(
      'id, key, name, summary, trade_category, project_type, engine_key, inputs_schema, version, basis',
    )
    .eq('active', true)
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    summary: r.summary ?? null,
    trade_category: r.trade_category ?? null,
    project_type: r.project_type ?? null,
    engine_key: r.engine_key,
    inputs_schema: Array.isArray(r.inputs_schema) ? r.inputs_schema : [],
    version: Number(r.version),
    basis: r.basis === 'indicative' ? 'indicative' : 'measured',
  }));
}

function normalizeMaterial(r: Record<string, unknown>): MaterialItem {
  return {
    code: r.code as string,
    name: r.name as string,
    category: r.category as string,
    trade_category: (r.trade_category as string | null) ?? null,
    unit: r.unit as string,
    base_unit_cost_pence: Number(r.base_unit_cost_pence),
    coverage_m2_per_litre:
      r.coverage_m2_per_litre == null ? null : Number(r.coverage_m2_per_litre),
    source: (r.source as string | null) ?? null,
    priced_on: r.priced_on as string,
  };
}

export async function loadPriceBook(): Promise<PriceBook> {
  const [materialsRes, labourRes, matOvrRes, labOvrRes] = await Promise.all([
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
    // RLS scopes these to the signed-in builder's tenant; empty for customers.
    supabase.from('tenant_material_prices').select('material_code, unit_cost_pence, updated_at'),
    supabase.from('tenant_labour_rates').select('trade, unit, rate_pence, updated_at'),
  ]);
  const materials = (materialsRes.data ?? []).map(normalizeMaterial);
  const labour: LabourRate[] = (labourRes.data ?? []).map((r) => ({
    trade: r.trade as string,
    unit: r.unit as string,
    base_rate_pence: Number(r.base_rate_pence),
    source: (r.source as string | null) ?? null,
    priced_on: r.priced_on as string,
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
  return mergePriceBook({ materials, labour }, materialOverrides, labourOverrides);
}

export function runTemplate(
  template: QuoteTemplate,
  inputs: Record<string, unknown>,
  book: PriceBook,
): GenerateResult {
  return generateQuoteFromTemplate(template.engine_key, inputs, book);
}

// --- handoff into create-estimate ------------------------------------------
// Router params can't carry a line array, so the question screen stashes the
// generated draft here and create-estimate consumes it once on mount.

export interface PendingTemplateQuote {
  title: string;
  projectType: string;
  lines: EstimateLineDraft[];
  pricedOn: string | null;
  indicative?: boolean;
}

let pending: PendingTemplateQuote | null = null;

export function setPendingTemplateQuote(p: PendingTemplateQuote): void {
  pending = p;
}
/** Returns the stashed draft (if any) and clears it — single use. */
export function consumePendingTemplateQuote(): PendingTemplateQuote | null {
  const p = pending;
  pending = null;
  return p;
}
