/**
 * Quote Templates v2 — the estimating engine (shared by mobile + web).
 *
 * A template asks the builder a few plain questions, then this engine turns
 * the answers into ordinary, fully-editable estimate line items — PRICED from
 * the platform catalogue (material_items + labour_rates) so the builder never
 * types a price from scratch. The suggested prices are data-grounded (each
 * catalogue row carries a cited `source` + `priced_on`); the builder edits any
 * line and sets a single margin that is applied on top of cost.
 *
 * The DB holds the *prices + coverage* (so they can be refreshed / overridden
 * later); the per-template *computation* lives here, keyed by engine_key. That
 * keeps us from needing a formula interpreter in Postgres for the first slice.
 *
 * Money is integer pence; quantities are plain numbers. The lines produced
 * here feed straight into createEstimate()/estimate_line_items, so the existing
 * money maths, VAT and margin tracking apply unchanged.
 */

import type { EstimateLineKind } from './types';

// --- catalogue row shapes (mirror the DB tables) ---------------------------

export interface MaterialItem {
  code: string;
  name: string;
  category: string;
  trade_category: string | null;
  unit: string;
  base_unit_cost_pence: number;
  /** Physical coverage from the maker's TDS; null for non-paint items. */
  coverage_m2_per_litre: number | null;
  source: string | null;
  priced_on: string; // ISO date
}

export interface LabourRate {
  trade: string;
  unit: string; // 'day' | 'hour'
  base_rate_pence: number;
  source: string | null;
  priced_on: string;
}

export interface TemplateField {
  key: string;
  label: string;
  unit?: string;
  type: 'number' | 'bool' | 'select';
  options?: (string | number)[];
  default?: unknown;
  showIf?: string;
}

export interface QuoteTemplate {
  id: string;
  key: string;
  name: string;
  summary: string | null;
  trade_category: string | null;
  project_type: string | null;
  engine_key: string;
  inputs_schema: TemplateField[];
  version: number;
}

/** The prices available to the engine for one generation run. */
export interface PriceBook {
  materials: MaterialItem[];
  labour: LabourRate[];
}

/** A generated line — identical in shape to what the estimate editor edits. */
export interface GeneratedLine {
  kind: EstimateLineKind;
  description: string;
  quantity: number;
  unit: string;
  unit_cost_pence: number;
  markup_percent: number;
  /** Catalogue code this line was priced from (for "priced as of"/refresh). */
  source_code?: string | null;
}

export interface GenerateResult {
  lines: GeneratedLine[];
  /** Human-readable notes (e.g. a missing catalogue item, assumptions made). */
  warnings: string[];
  /** Oldest `priced_on` across every item used — powers "priced as of <date>". */
  priced_on: string | null;
}

// --- small helpers ---------------------------------------------------------

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
/** Round UP to the nearest `step` (e.g. paint bought in 0.5 L increments). */
function roundUpTo(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(Math.ceil(value / step) * step * 100) / 100;
}
/** Round to the nearest `step` (labour days to the nearest quarter day). */
function roundTo(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(Math.round(value / step) * step * 100) / 100;
}
function olderDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

// --- painting & decorating -------------------------------------------------

export type SurfaceCondition = 'good' | 'patch' | 'bare';
export type WoodworkExtent = 'none' | 'some' | 'lots';

export interface PaintingInputs {
  wall_area_m2: number;
  paint_ceiling: boolean;
  ceiling_area_m2: number;
  coats: number;
  surface: SurfaceCondition;
  woodwork: WoodworkExtent;
  margin_percent: number;
}

/**
 * Documented assumptions for the painting engine. Kept as named constants so
 * they are auditable and testable, not magic numbers buried in the maths.
 */
export const PAINTING_ASSUMPTIONS = {
  /** m² of wall/ceiling a decorator paints per day INCLUDING prep, at 2 coats.
   *  Trade man-hour norm ~0.20 mhr/m² for two coats (≈40 m²/8h day) — the
   *  rigorous/conservative end of the 40–90 m² range, so labour isn't
   *  under-quoted. Expressed as m²·coats/day = 40 × 2. */
  wall_m2_coats_per_day: 80,
  /** Extra decorator-days for surface prep. */
  prep_days: { good: 0, patch: 0.5, bare: 1 } as Record<SurfaceCondition, number>,
  /** Woodwork is slow; modelled as an equivalent area + extra labour-days. */
  woodwork_m2: { none: 0, some: 15, lots: 35 } as Record<WoodworkExtent, number>,
  woodwork_days: { none: 0, some: 0.5, lots: 1.5 } as Record<WoodworkExtent, number>,
  /** Minimum labour on any job that has painting. */
  min_labour_days: 0.5,
  /** Minimum consumables allowance (pence) however small the job. */
  min_sundries_pence: 2500,
} as const;

function findMaterial(book: PriceBook, code: string): MaterialItem | undefined {
  return book.materials.find((m) => m.code === code);
}
function findLabour(book: PriceBook, trade: string, unit = 'day'): LabourRate | undefined {
  return book.labour.find((l) => l.trade === trade && l.unit === unit);
}

function generatePainting(inputs: PaintingInputs, book: PriceBook): GenerateResult {
  const warnings: string[] = [];
  const lines: GeneratedLine[] = [];
  let pricedOn: string | null = null;

  const wall = Math.max(0, num(inputs.wall_area_m2));
  const ceiling = inputs.paint_ceiling ? Math.max(0, num(inputs.ceiling_area_m2)) : 0;
  const painted = wall + ceiling;
  const coats = Math.max(1, Math.round(num(inputs.coats, 2)));
  const surface: SurfaceCondition =
    inputs.surface === 'good' || inputs.surface === 'bare' ? inputs.surface : 'patch';
  const woodwork: WoodworkExtent =
    inputs.woodwork === 'none' || inputs.woodwork === 'lots' ? inputs.woodwork : 'some';
  const margin = Math.max(0, num(inputs.margin_percent, 0));

  const emulsion = findMaterial(book, 'PAINT-EMULSION-TRADE');
  const primer = findMaterial(book, 'PAINT-PRIMER-TRADE');
  const satin = findMaterial(book, 'PAINT-SATINWOOD-TRADE');
  const sundries = findMaterial(book, 'DECOR-SUNDRIES');
  const decorator = findLabour(book, 'decorator', 'day');

  // 1) Emulsion for walls + ceilings.
  if (painted > 0) {
    if (emulsion && emulsion.coverage_m2_per_litre) {
      const litres = roundUpTo((painted * coats) / emulsion.coverage_m2_per_litre, 0.5);
      lines.push({
        kind: 'material',
        description: `${emulsion.name} — ${coats} coat${coats > 1 ? 's' : ''}`,
        quantity: litres,
        unit: 'litre',
        unit_cost_pence: emulsion.base_unit_cost_pence,
        markup_percent: margin,
        source_code: emulsion.code,
      });
      pricedOn = olderDate(pricedOn, emulsion.priced_on);
    } else {
      warnings.push('Emulsion price missing from the catalogue — add it manually.');
    }
  }

  // 2) Primer / mist coat only needed on bare/new plaster.
  if (painted > 0 && surface === 'bare') {
    if (primer && primer.coverage_m2_per_litre) {
      const litres = roundUpTo(painted / primer.coverage_m2_per_litre, 0.5);
      lines.push({
        kind: 'material',
        description: 'Primer / mist coat on bare plaster',
        quantity: litres,
        unit: 'litre',
        unit_cost_pence: primer.base_unit_cost_pence,
        markup_percent: margin,
        source_code: primer.code,
      });
      pricedOn = olderDate(pricedOn, primer.priced_on);
    } else {
      warnings.push('Primer price missing from the catalogue — add it manually.');
    }
  }

  // 3) Woodwork: undercoat (1 coat) + satinwood/gloss (2 coats).
  const woodM2 = PAINTING_ASSUMPTIONS.woodwork_m2[woodwork];
  if (woodM2 > 0) {
    if (primer && primer.coverage_m2_per_litre) {
      const litres = roundUpTo(woodM2 / primer.coverage_m2_per_litre, 0.5);
      lines.push({
        kind: 'material',
        description: 'Wood primer / undercoat',
        quantity: litres,
        unit: 'litre',
        unit_cost_pence: primer.base_unit_cost_pence,
        markup_percent: margin,
        source_code: primer.code,
      });
      pricedOn = olderDate(pricedOn, primer.priced_on);
    }
    if (satin && satin.coverage_m2_per_litre) {
      const litres = roundUpTo((woodM2 * 2) / satin.coverage_m2_per_litre, 0.5);
      lines.push({
        kind: 'material',
        description: `${satin.name} — 2 coats`,
        quantity: litres,
        unit: 'litre',
        unit_cost_pence: satin.base_unit_cost_pence,
        markup_percent: margin,
        source_code: satin.code,
      });
      pricedOn = olderDate(pricedOn, satin.priced_on);
    }
  }

  // 4) Consumables allowance (tape, filler, caulk, dust sheets, sleeves).
  if (painted > 0 && sundries) {
    const perM2 = sundries.base_unit_cost_pence; // pence per m²
    const allowance = Math.max(
      PAINTING_ASSUMPTIONS.min_sundries_pence,
      Math.round((painted + woodM2) * perM2),
    );
    lines.push({
      kind: 'material',
      description: sundries.name,
      quantity: 1,
      unit: 'job',
      unit_cost_pence: allowance,
      markup_percent: margin,
      source_code: sundries.code,
    });
    pricedOn = olderDate(pricedOn, sundries.priced_on);
  }

  // 5) Labour (decorator day rate).
  if (painted > 0 || woodM2 > 0) {
    const wallDays = (painted * coats) / PAINTING_ASSUMPTIONS.wall_m2_coats_per_day;
    const prepDays = PAINTING_ASSUMPTIONS.prep_days[surface];
    const woodDays = PAINTING_ASSUMPTIONS.woodwork_days[woodwork];
    let days = roundTo(wallDays + prepDays + woodDays, 0.25);
    if (days < PAINTING_ASSUMPTIONS.min_labour_days) days = PAINTING_ASSUMPTIONS.min_labour_days;
    if (decorator) {
      lines.push({
        kind: 'labour_day_rate',
        description: `Decorator labour — prep, cutting-in & ${coats} coat${coats > 1 ? 's' : ''}`,
        quantity: days,
        unit: 'day',
        unit_cost_pence: decorator.base_rate_pence,
        markup_percent: margin,
        source_code: null,
      });
      pricedOn = olderDate(pricedOn, decorator.priced_on);
    } else {
      warnings.push('Decorator day rate missing — add your labour manually.');
    }
  }

  if (lines.length === 0) {
    warnings.push('Nothing to quote yet — enter a wall or ceiling area.');
  }

  return { lines, warnings, priced_on: pricedOn };
}

// --- public entry point -----------------------------------------------------

/**
 * Generate editable estimate lines for a template. Dispatches on engine_key.
 * Unknown engines return an empty result with a warning (so the UI can fall
 * back to a blank quote rather than throwing).
 */
export function generateQuoteFromTemplate(
  engineKey: string,
  inputs: Record<string, unknown>,
  book: PriceBook,
): GenerateResult {
  switch (engineKey) {
    case 'painting_decorating':
      return generatePainting(
        {
          wall_area_m2: num(inputs.wall_area_m2),
          paint_ceiling: inputs.paint_ceiling !== false,
          ceiling_area_m2: num(inputs.ceiling_area_m2),
          coats: num(inputs.coats, 2),
          surface: (inputs.surface as SurfaceCondition) ?? 'patch',
          woodwork: (inputs.woodwork as WoodworkExtent) ?? 'some',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    default:
      return {
        lines: [],
        warnings: [`No generator for template "${engineKey}".`],
        priced_on: null,
      };
  }
}
