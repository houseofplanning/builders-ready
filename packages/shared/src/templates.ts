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

export interface TemplateSelectOption {
  value: string | number;
  label: string;
}

export interface TemplateField {
  key: string;
  label: string;
  unit?: string;
  type: 'number' | 'bool' | 'select';
  options?: (string | number | TemplateSelectOption)[];
  default?: unknown;
  showIf?: string;
  hint?: string;
}

/** 'measured' = precise, quantity-driven (tiling, plastering). 'indicative' =
 *  a size/tier guideline from published benchmark costs, to be refined. */
export type TemplateBasis = 'measured' | 'indicative';

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
  basis: TemplateBasis;
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
  /** For indicative templates: ± fraction to show as a guideline range (e.g. 0.12). */
  uncertainty?: number;
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

/** A room measured by its dimensions, so the app can derive paintable area
 *  instead of asking the builder to work out m² in their head. */
export interface PaintingRoom {
  length_m: number;
  width_m: number;
  height_m: number;
  paint_ceiling: boolean;
}

/** Flat allowance knocked off WALL area for doors/windows (ceilings unaffected). */
export const WALL_OPENINGS_DEDUCTION = 0.1;
/** Typical UK ceiling height used when a room's height is left blank. */
export const DEFAULT_CEILING_HEIGHT_M = 2.4;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Turn room dimensions into paintable wall + ceiling area.
 *   wall    = perimeter × height × (1 − openings allowance)   [2·(L+W)·H]
 *   ceiling = L × W, only for rooms whose ceiling is being painted
 * This is the input-layer maths shared by mobile + web so both agree; the
 * priced generator still works purely on the aggregate m².
 */
export function paintingAreasFromRooms(rooms: PaintingRoom[]): {
  wall_area_m2: number;
  ceiling_area_m2: number;
} {
  let wall = 0;
  let ceiling = 0;
  for (const r of rooms) {
    const L = Math.max(0, num(r.length_m));
    const W = Math.max(0, num(r.width_m));
    const H = Math.max(0, num(r.height_m) || DEFAULT_CEILING_HEIGHT_M);
    wall += 2 * (L + W) * H * (1 - WALL_OPENINGS_DEDUCTION);
    if (r.paint_ceiling) ceiling += L * W;
  }
  return { wall_area_m2: round2(wall), ceiling_area_m2: round2(ceiling) };
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

// --- plastering / skimming -------------------------------------------------

export type PlasteringJob = 'skim' | 'board_and_skim' | 'reskim_bare';

export interface PlasteringInputs {
  area_m2: number;
  job_type: PlasteringJob;
  margin_percent: number;
}

/**
 * Documented physical + productivity facts for plastering. Prices live in the
 * catalogue (they change); these quantities rarely do, so they're constants
 * with their sources, not magic numbers.
 */
export const PLASTERING_ASSUMPTIONS = {
  /** m² one 25kg bag of multi-finish skims at ~2mm (British Gypsum Thistle). */
  skim_m2_per_bag: 10,
  /** m² one 25kg bag of bonding undercoat covers at 11mm (British Gypsum). */
  bonding_m2_per_bag: 2.75,
  /** m² of one 2.4×1.2m plasterboard sheet. */
  board_m2: 2.88,
  /** Order a little extra for cuts/waste. */
  waste: 1.1,
  /** Plasterer m²/day by job type (Argo Contractors ~20–40 skim; conservative). */
  m2_per_day: { skim: 25, board_and_skim: 18, reskim_bare: 12 } as Record<
    PlasteringJob,
    number
  >,
  /** Plastering sundries allowance (PVA, scrim, beads) per m², pence. */
  sundries_pence_per_m2: 150,
  min_labour_days: 0.5,
} as const;

function generatePlastering(inputs: PlasteringInputs, book: PriceBook): GenerateResult {
  const warnings: string[] = [];
  const lines: GeneratedLine[] = [];
  let pricedOn: string | null = null;

  const area = Math.max(0, num(inputs.area_m2));
  const job: PlasteringJob =
    inputs.job_type === 'board_and_skim' || inputs.job_type === 'reskim_bare'
      ? inputs.job_type
      : 'skim';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  const A = PLASTERING_ASSUMPTIONS;

  const skim = findMaterial(book, 'PLASTER-MULTIFINISH');
  const bonding = findMaterial(book, 'PLASTER-BONDING');
  const board = findMaterial(book, 'PLASTERBOARD-STD');
  const sundries = findMaterial(book, 'PLASTER-SUNDRIES');
  const plasterer = findLabour(book, 'plasterer', 'day');

  if (area <= 0) {
    return { lines, warnings: ['Enter the area to plaster.'], priced_on: null };
  }

  function push(line: GeneratedLine, pricedOnDate: string | null) {
    lines.push(line);
    pricedOn = olderDate(pricedOn, pricedOnDate);
  }

  // New plasterboard first (board & skim).
  if (job === 'board_and_skim' && board) {
    const sheets = Math.ceil((area / A.board_m2) * A.waste);
    push(
      {
        kind: 'material',
        description: `${board.name} — ${sheets} board${sheets > 1 ? 's' : ''}`,
        quantity: sheets,
        unit: 'board',
        unit_cost_pence: board.base_unit_cost_pence,
        markup_percent: margin,
        source_code: board.code,
      },
      board.priced_on,
    );
  }

  // Bonding undercoat for bare masonry (re-skim bare).
  if (job === 'reskim_bare' && bonding) {
    const bags = Math.ceil((area / A.bonding_m2_per_bag) * A.waste);
    push(
      {
        kind: 'material',
        description: `${bonding.name} — ${bags} bag${bags > 1 ? 's' : ''}`,
        quantity: bags,
        unit: 'bag',
        unit_cost_pence: bonding.base_unit_cost_pence,
        markup_percent: margin,
        source_code: bonding.code,
      },
      bonding.priced_on,
    );
  }

  // Skim finish — every job.
  if (skim) {
    const bags = Math.ceil((area / A.skim_m2_per_bag) * A.waste);
    push(
      {
        kind: 'material',
        description: `${skim.name} — ${bags} bag${bags > 1 ? 's' : ''}`,
        quantity: bags,
        unit: 'bag',
        unit_cost_pence: skim.base_unit_cost_pence,
        markup_percent: margin,
        source_code: skim.code,
      },
      skim.priced_on,
    );
  } else {
    warnings.push('Skim plaster price missing — add it manually.');
  }

  // Sundries allowance.
  if (sundries) {
    push(
      {
        kind: 'material',
        description: sundries.name,
        quantity: Math.round(area),
        unit: 'm²',
        unit_cost_pence: sundries.base_unit_cost_pence,
        markup_percent: margin,
        source_code: sundries.code,
      },
      sundries.priced_on,
    );
  }

  // Labour.
  if (plasterer) {
    let days = roundTo(area / A.m2_per_day[job], 0.25);
    if (days < A.min_labour_days) days = A.min_labour_days;
    const jobLabel =
      job === 'board_and_skim'
        ? 'board & skim'
        : job === 'reskim_bare'
          ? 're-plaster bare walls'
          : 'skim';
    push(
      {
        kind: 'labour_day_rate',
        description: `Plasterer labour — ${jobLabel}`,
        quantity: days,
        unit: 'day',
        unit_cost_pence: plasterer.base_rate_pence,
        markup_percent: margin,
        source_code: null,
      },
      plasterer.priced_on,
    );
  } else {
    warnings.push('Plasterer day rate missing — add your labour manually.');
  }

  return { lines, warnings, priced_on: pricedOn };
}

// --- driveways & paving ----------------------------------------------------

export type PaveSurface = 'block' | 'resin' | 'concrete';

export interface PavingInputs {
  area_m2: number;
  surface_type: PaveSurface;
  new_subbase: boolean;
  margin_percent: number;
}

/** Paving laying output (m²/day) by surface + sub-base prep rate. Block ~10,
 *  resin ~25, concrete ~15 m²/day (paving cost guides). */
export const PAVING_ASSUMPTIONS = {
  waste: 1.05,
  lay_m2_per_day: { block: 10, resin: 25, concrete: 15 } as Record<PaveSurface, number>,
  subbase_m2_per_day: 25,
  min_labour_days: 0.5,
} as const;

function generatePaving(inputs: PavingInputs, book: PriceBook): GenerateResult {
  const lines: GeneratedLine[] = [];
  const warnings: string[] = [];
  let pricedOn: string | null = null;
  const A = PAVING_ASSUMPTIONS;
  const area = Math.max(0, num(inputs.area_m2));
  const surf: PaveSurface =
    inputs.surface_type === 'resin' || inputs.surface_type === 'concrete'
      ? inputs.surface_type
      : 'block';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  if (area <= 0) return { lines, warnings: ['Enter the area to pave.'], priced_on: null };
  const push = (l: GeneratedLine, w: string | null) => {
    lines.push(l);
    pricedOn = olderDate(pricedOn, w);
  };
  const mat = (code: string, desc: string, qty: number, unit: string) => {
    const m = findMaterial(book, code);
    if (!m) {
      warnings.push(`${desc} price missing — add manually.`);
      return;
    }
    push(
      { kind: 'material', description: desc, quantity: qty, unit, unit_cost_pence: m.base_unit_cost_pence, markup_percent: margin, source_code: m.code },
      m.priced_on,
    );
  };
  const surfLabel = surf === 'resin' ? 'Resin-bound' : surf === 'concrete' ? 'Concrete' : 'Block paving';
  mat(`PAVE-${surf.toUpperCase()}`, `${surfLabel} surface`, roundUpTo(area * A.waste, 0.5), 'm²');
  if (inputs.new_subbase) mat('PAVE-SUBBASE', 'MOT Type 1 sub-base & membrane', Math.round(area), 'm²');
  mat('PAVE-SUNDRIES', 'Edgings, bedding sand & sundries', Math.round(area), 'm²');
  const gw = findLabour(book, 'groundworker', 'day');
  if (gw) {
    let days = area / A.lay_m2_per_day[surf] + (inputs.new_subbase ? area / A.subbase_m2_per_day : 0);
    days = roundTo(days, 0.25);
    if (days < A.min_labour_days) days = A.min_labour_days;
    push(
      { kind: 'labour_day_rate', description: `Groundwork & laying — ${surfLabel.toLowerCase()}`, quantity: days, unit: 'day', unit_cost_pence: gw.base_rate_pence, markup_percent: margin, source_code: null },
      gw.priced_on,
    );
  } else warnings.push('Groundworker day rate missing — add manually.');
  return { lines, warnings, priced_on: pricedOn };
}

// --- fencing ---------------------------------------------------------------

export type FenceType = 'lap_timber' | 'closeboard_concrete' | 'composite';

export interface FencingInputs {
  length_m: number;
  fence_type: FenceType;
  margin_percent: number;
}

export const FENCING_ASSUMPTIONS = { m_per_day: 8, min_labour_days: 0.5 } as const;

function generateFencing(inputs: FencingInputs, book: PriceBook): GenerateResult {
  const lines: GeneratedLine[] = [];
  const warnings: string[] = [];
  let pricedOn: string | null = null;
  const len = Math.max(0, num(inputs.length_m));
  const type: FenceType =
    inputs.fence_type === 'closeboard_concrete' || inputs.fence_type === 'composite'
      ? inputs.fence_type
      : 'lap_timber';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  if (len <= 0) return { lines, warnings: ['Enter the fence length.'], priced_on: null };
  const push = (l: GeneratedLine, w: string | null) => {
    lines.push(l);
    pricedOn = olderDate(pricedOn, w);
  };
  const codeMap: Record<FenceType, string> = {
    lap_timber: 'FENCE-LAP',
    closeboard_concrete: 'FENCE-CLOSEBOARD',
    composite: 'FENCE-COMPOSITE',
  };
  const fence = findMaterial(book, codeMap[type]);
  if (fence) {
    push(
      { kind: 'material', description: `${fence.name}`, quantity: roundUpTo(len, 0.5), unit: 'm', unit_cost_pence: fence.base_unit_cost_pence, markup_percent: margin, source_code: fence.code },
      fence.priced_on,
    );
  } else warnings.push('Fence price missing — add manually.');
  const sundries = findMaterial(book, 'FENCE-SUNDRIES');
  if (sundries)
    push(
      { kind: 'material', description: sundries.name, quantity: Math.round(len), unit: 'm', unit_cost_pence: sundries.base_unit_cost_pence, markup_percent: margin, source_code: sundries.code },
      sundries.priced_on,
    );
  const fencer = findLabour(book, 'fencer', 'day');
  if (fencer) {
    let days = roundTo(len / FENCING_ASSUMPTIONS.m_per_day, 0.25);
    if (days < FENCING_ASSUMPTIONS.min_labour_days) days = FENCING_ASSUMPTIONS.min_labour_days;
    push(
      { kind: 'labour_day_rate', description: 'Fencer labour — install posts & panels', quantity: days, unit: 'day', unit_cost_pence: fencer.base_rate_pence, markup_percent: margin, source_code: null },
      fencer.priced_on,
    );
  } else warnings.push('Fencer day rate missing — add manually.');
  return { lines, warnings, priced_on: pricedOn };
}

// --- turfing ---------------------------------------------------------------

export interface TurfingInputs {
  area_m2: number;
  ground_prep: boolean;
  margin_percent: number;
}

export const TURFING_ASSUMPTIONS = {
  waste: 1.05,
  lay_m2_per_day: 40,
  prep_m2_per_day: 30,
  min_labour_days: 0.5,
} as const;

function generateTurfing(inputs: TurfingInputs, book: PriceBook): GenerateResult {
  const lines: GeneratedLine[] = [];
  const warnings: string[] = [];
  let pricedOn: string | null = null;
  const A = TURFING_ASSUMPTIONS;
  const area = Math.max(0, num(inputs.area_m2));
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  if (area <= 0) return { lines, warnings: ['Enter the lawn area.'], priced_on: null };
  const push = (l: GeneratedLine, w: string | null) => {
    lines.push(l);
    pricedOn = olderDate(pricedOn, w);
  };
  const mat = (code: string, qty: number) => {
    const m = findMaterial(book, code);
    if (!m) return;
    push(
      { kind: 'material', description: m.name, quantity: qty, unit: 'm²', unit_cost_pence: m.base_unit_cost_pence, markup_percent: margin, source_code: m.code },
      m.priced_on,
    );
  };
  mat('TURF-ROLL', roundUpTo(area * A.waste, 0.5));
  if (inputs.ground_prep) mat('TURF-TOPSOIL', Math.round(area));
  const ls = findLabour(book, 'landscaper', 'day');
  if (ls) {
    let days = area / A.lay_m2_per_day + (inputs.ground_prep ? area / A.prep_m2_per_day : 0);
    days = roundTo(days, 0.25);
    if (days < A.min_labour_days) days = A.min_labour_days;
    push(
      { kind: 'labour_day_rate', description: `Landscaper labour — ${inputs.ground_prep ? 'ground prep & turfing' : 'turfing'}`, quantity: days, unit: 'day', unit_cost_pence: ls.base_rate_pence, markup_percent: margin, source_code: null },
      ls.priced_on,
    );
  } else warnings.push('Landscaper day rate missing — add manually.');
  return { lines, warnings, priced_on: pricedOn };
}

// --- decking ---------------------------------------------------------------

export type DeckType = 'softwood' | 'composite';

export interface DeckingInputs {
  area_m2: number;
  deck_type: DeckType;
  margin_percent: number;
}

export const DECKING_ASSUMPTIONS = { waste: 1.05, m2_per_day: 8, min_labour_days: 0.5 } as const;

function generateDecking(inputs: DeckingInputs, book: PriceBook): GenerateResult {
  const lines: GeneratedLine[] = [];
  const warnings: string[] = [];
  let pricedOn: string | null = null;
  const A = DECKING_ASSUMPTIONS;
  const area = Math.max(0, num(inputs.area_m2));
  const type: DeckType = inputs.deck_type === 'composite' ? 'composite' : 'softwood';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  if (area <= 0) return { lines, warnings: ['Enter the deck area.'], priced_on: null };
  const push = (l: GeneratedLine, w: string | null) => {
    lines.push(l);
    pricedOn = olderDate(pricedOn, w);
  };
  const deck = findMaterial(book, type === 'composite' ? 'DECK-COMPOSITE' : 'DECK-SOFTWOOD');
  if (deck)
    push(
      { kind: 'material', description: `${deck.name} (boards & frame)`, quantity: roundUpTo(area * A.waste, 0.5), unit: 'm²', unit_cost_pence: deck.base_unit_cost_pence, markup_percent: margin, source_code: deck.code },
      deck.priced_on,
    );
  else warnings.push('Decking price missing — add manually.');
  const sundries = findMaterial(book, 'DECK-SUNDRIES');
  if (sundries)
    push(
      { kind: 'material', description: sundries.name, quantity: Math.round(area), unit: 'm²', unit_cost_pence: sundries.base_unit_cost_pence, markup_percent: margin, source_code: sundries.code },
      sundries.priced_on,
    );
  const ls = findLabour(book, 'landscaper', 'day');
  if (ls) {
    let days = roundTo(area / A.m2_per_day, 0.25);
    if (days < A.min_labour_days) days = A.min_labour_days;
    push(
      { kind: 'labour_day_rate', description: `Labour — build ${type} decking & frame`, quantity: days, unit: 'day', unit_cost_pence: ls.base_rate_pence, markup_percent: margin, source_code: null },
      ls.priced_on,
    );
  } else warnings.push('Decking labour rate missing — add manually.');
  return { lines, warnings, priced_on: pricedOn };
}

// --- bricklaying -----------------------------------------------------------

export type WallType = 'single' | 'cavity' | 'double';

export interface BricklayingInputs {
  area_m2: number;
  wall_type: WallType;
  margin_percent: number;
}

/**
 * Brickwork quantities + output. 60 bricks/m² single skin, 120 double; dense
 * blocks 10/m² (BDA/trade standard). Bricklayer ~500 bricks/day ≈ 8–10 m²
 * single skin (Checkatrade); conservative per wall type. Prices in catalogue.
 */
export const BRICKLAYING_ASSUMPTIONS = {
  bricks_per_m2: { single: 60, cavity: 60, double: 120 } as Record<WallType, number>,
  blocks_per_m2_cavity: 10,
  brick_waste: 1.05,
  mortar_factor: { single: 1, cavity: 1, double: 1.8 } as Record<WallType, number>,
  m2_per_day: { single: 9, cavity: 7, double: 4.5 } as Record<WallType, number>,
  min_labour_days: 0.5,
} as const;

function generateBricklaying(inputs: BricklayingInputs, book: PriceBook): GenerateResult {
  const warnings: string[] = [];
  const lines: GeneratedLine[] = [];
  let pricedOn: string | null = null;
  const A = BRICKLAYING_ASSUMPTIONS;

  const area = Math.max(0, num(inputs.area_m2));
  const wall: WallType =
    inputs.wall_type === 'cavity' || inputs.wall_type === 'double'
      ? inputs.wall_type
      : 'single';
  const margin = Math.max(0, num(inputs.margin_percent, 0));

  if (area <= 0) return { lines, warnings: ['Enter the wall area.'], priced_on: null };

  function push(line: GeneratedLine, when: string | null) {
    lines.push(line);
    pricedOn = olderDate(pricedOn, when);
  }

  const brick = findMaterial(book, 'BRICK-FACING');
  if (brick) {
    const n = Math.ceil(area * A.bricks_per_m2[wall] * A.brick_waste);
    push(
      {
        kind: 'material',
        description: `Facing bricks — ${n.toLocaleString()}`,
        quantity: n,
        unit: 'brick',
        unit_cost_pence: brick.base_unit_cost_pence,
        markup_percent: margin,
        source_code: brick.code,
      },
      brick.priced_on,
    );
  } else {
    warnings.push('Facing brick price missing — add it manually.');
  }

  if (wall === 'cavity') {
    const block = findMaterial(book, 'BLOCK-DENSE');
    if (block) {
      const n = Math.ceil(area * A.blocks_per_m2_cavity * A.brick_waste);
      push(
        {
          kind: 'material',
          description: `Concrete blocks (inner skin) — ${n}`,
          quantity: n,
          unit: 'block',
          unit_cost_pence: block.base_unit_cost_pence,
          markup_percent: margin,
          source_code: block.code,
        },
        block.priced_on,
      );
    }
  }

  const mortar = findMaterial(book, 'BRICK-MORTAR');
  if (mortar) {
    push(
      {
        kind: 'material',
        description: mortar.name,
        quantity: Math.round(area * A.mortar_factor[wall]),
        unit: 'm²',
        unit_cost_pence: mortar.base_unit_cost_pence,
        markup_percent: margin,
        source_code: mortar.code,
      },
      mortar.priced_on,
    );
  }

  const sundries = findMaterial(book, 'BRICK-SUNDRIES');
  if (sundries) {
    push(
      {
        kind: 'material',
        description: sundries.name,
        quantity: Math.round(area),
        unit: 'm²',
        unit_cost_pence: sundries.base_unit_cost_pence,
        markup_percent: margin,
        source_code: sundries.code,
      },
      sundries.priced_on,
    );
  }

  const brickie = findLabour(book, 'bricklayer', 'day');
  if (brickie) {
    let days = roundTo(area / A.m2_per_day[wall], 0.25);
    if (days < A.min_labour_days) days = A.min_labour_days;
    const wallLabel =
      wall === 'cavity' ? 'cavity wall' : wall === 'double' ? 'one-brick wall' : 'single skin';
    push(
      {
        kind: 'labour_day_rate',
        description: `Bricklayer labour — ${wallLabel}`,
        quantity: days,
        unit: 'day',
        unit_cost_pence: brickie.base_rate_pence,
        markup_percent: margin,
        source_code: null,
      },
      brickie.priced_on,
    );
  } else {
    warnings.push('Bricklayer day rate missing — add your labour manually.');
  }

  return { lines, warnings, priced_on: pricedOn };
}

// --- flooring --------------------------------------------------------------

export type FloorType = 'laminate' | 'lvt' | 'engineered';

export interface FlooringInputs {
  area_m2: number;
  floor_type: FloorType;
  underlay: boolean;
  margin_percent: number;
}

/** Floor-fitter output ~15–25 m²/day click (Pricing Penguin); 18 conservative. */
export const FLOORING_ASSUMPTIONS = {
  waste: 1.1,
  underlay_waste: 1.05,
  m2_per_day: 18,
  min_labour_days: 0.5,
} as const;

function generateFlooring(inputs: FlooringInputs, book: PriceBook): GenerateResult {
  const warnings: string[] = [];
  const lines: GeneratedLine[] = [];
  let pricedOn: string | null = null;
  const A = FLOORING_ASSUMPTIONS;

  const area = Math.max(0, num(inputs.area_m2));
  const type: FloorType =
    inputs.floor_type === 'lvt' || inputs.floor_type === 'engineered'
      ? inputs.floor_type
      : 'laminate';
  const margin = Math.max(0, num(inputs.margin_percent, 0));

  if (area <= 0) return { lines, warnings: ['Enter the floor area.'], priced_on: null };

  function push(line: GeneratedLine, when: string | null) {
    lines.push(line);
    pricedOn = olderDate(pricedOn, when);
  }

  const typeLabel =
    type === 'lvt' ? 'LVT' : type === 'engineered' ? 'Engineered wood' : 'Laminate';
  const floor = findMaterial(book, `FLOOR-${type.toUpperCase()}`);
  if (floor) {
    push(
      {
        kind: 'material',
        description: `${typeLabel} flooring`,
        quantity: roundUpTo(area * A.waste, 0.5),
        unit: 'm²',
        unit_cost_pence: floor.base_unit_cost_pence,
        markup_percent: margin,
        source_code: floor.code,
      },
      floor.priced_on,
    );
  } else {
    warnings.push('Flooring price missing — add it manually.');
  }

  if (inputs.underlay) {
    const underlay = findMaterial(book, 'FLOOR-UNDERLAY');
    if (underlay) {
      push(
        {
          kind: 'material',
          description: underlay.name,
          quantity: roundUpTo(area * A.underlay_waste, 0.5),
          unit: 'm²',
          unit_cost_pence: underlay.base_unit_cost_pence,
          markup_percent: margin,
          source_code: underlay.code,
        },
        underlay.priced_on,
      );
    }
  }

  const sundries = findMaterial(book, 'FLOOR-SUNDRIES');
  if (sundries) {
    push(
      {
        kind: 'material',
        description: sundries.name,
        quantity: Math.round(area),
        unit: 'm²',
        unit_cost_pence: sundries.base_unit_cost_pence,
        markup_percent: margin,
        source_code: sundries.code,
      },
      sundries.priced_on,
    );
  }

  const fitter = findLabour(book, 'floor_fitter', 'day');
  if (fitter) {
    let days = roundTo(area / A.m2_per_day, 0.25);
    if (days < A.min_labour_days) days = A.min_labour_days;
    push(
      {
        kind: 'labour_day_rate',
        description: `Floor fitter labour — ${typeLabel.toLowerCase()}`,
        quantity: days,
        unit: 'day',
        unit_cost_pence: fitter.base_rate_pence,
        markup_percent: margin,
        source_code: null,
      },
      fitter.priced_on,
    );
  } else {
    warnings.push('Floor fitter day rate missing — add your labour manually.');
  }

  return { lines, warnings, priced_on: pricedOn };
}

// --- tiling ----------------------------------------------------------------

export type TileSurface = 'wall' | 'floor';
export type TileTier = 'budget' | 'mid' | 'premium';

export interface TilingInputs {
  area_m2: number;
  surface: TileSurface;
  tile_tier: TileTier;
  margin_percent: number;
}

/**
 * Tiling physical + productivity facts. Adhesive coverage ~4 m²/20kg bag
 * (Mapei/BAL/trade calculators, mid of 3–6.5). Tiler output deliberately
 * conservative (Checkatrade 8–12 floor / 10–15 wall m²/day) so labour isn't
 * under-quoted on cutting-heavy rooms. Prices live in the catalogue.
 */
export const TILING_ASSUMPTIONS = {
  adhesive_m2_per_bag: 4,
  waste: 1.1,
  m2_per_day: { wall: 10, floor: 12 } as Record<TileSurface, number>,
  min_labour_days: 0.5,
} as const;

function generateTiling(inputs: TilingInputs, book: PriceBook): GenerateResult {
  const warnings: string[] = [];
  const lines: GeneratedLine[] = [];
  let pricedOn: string | null = null;
  const A = TILING_ASSUMPTIONS;

  const area = Math.max(0, num(inputs.area_m2));
  const surface: TileSurface = inputs.surface === 'floor' ? 'floor' : 'wall';
  const tier: TileTier =
    inputs.tile_tier === 'mid' || inputs.tile_tier === 'premium'
      ? inputs.tile_tier
      : 'budget';
  const margin = Math.max(0, num(inputs.margin_percent, 0));

  if (area <= 0) return { lines, warnings: ['Enter the area to tile.'], priced_on: null };

  function push(line: GeneratedLine, when: string | null) {
    lines.push(line);
    pricedOn = olderDate(pricedOn, when);
  }

  const tierLabel = tier === 'budget' ? 'Budget' : tier === 'mid' ? 'Mid-range' : 'Premium';
  const tiles = findMaterial(book, `TILE-${tier.toUpperCase()}`);
  if (tiles) {
    push(
      {
        kind: 'material',
        description: `${tierLabel} tiles — ${surface}`,
        quantity: roundUpTo(area * A.waste, 0.5),
        unit: 'm²',
        unit_cost_pence: tiles.base_unit_cost_pence,
        markup_percent: margin,
        source_code: tiles.code,
      },
      tiles.priced_on,
    );
  } else {
    warnings.push('Tile price missing — add it manually.');
  }

  const adhesive = findMaterial(book, 'TILE-ADHESIVE');
  if (adhesive) {
    const bags = Math.ceil((area / A.adhesive_m2_per_bag) * A.waste);
    push(
      {
        kind: 'material',
        description: `${adhesive.name} — ${bags} bag${bags > 1 ? 's' : ''}`,
        quantity: bags,
        unit: 'bag',
        unit_cost_pence: adhesive.base_unit_cost_pence,
        markup_percent: margin,
        source_code: adhesive.code,
      },
      adhesive.priced_on,
    );
  }

  const sundries = findMaterial(book, 'TILE-SUNDRIES');
  if (sundries) {
    push(
      {
        kind: 'material',
        description: sundries.name,
        quantity: Math.round(area),
        unit: 'm²',
        unit_cost_pence: sundries.base_unit_cost_pence,
        markup_percent: margin,
        source_code: sundries.code,
      },
      sundries.priced_on,
    );
  }

  const tiler = findLabour(book, 'tiler', 'day');
  if (tiler) {
    let days = roundTo(area / A.m2_per_day[surface], 0.25);
    if (days < A.min_labour_days) days = A.min_labour_days;
    push(
      {
        kind: 'labour_day_rate',
        description: `Tiler labour — ${surface} tiling`,
        quantity: days,
        unit: 'day',
        unit_cost_pence: tiler.base_rate_pence,
        markup_percent: margin,
        source_code: null,
      },
      tiler.priced_on,
    );
  } else {
    warnings.push('Tiler day rate missing — add your labour manually.');
  }

  return { lines, warnings, priced_on: pricedOn };
}

// --- whole-project guidelines (INDICATIVE) ---------------------------------
// These split a benchmark build price into sensible stage allowances the
// builder refines. The rate is an all-in market figure (margin typically
// already reflected), so margin defaults to 0 and a ±20% range is shown.

interface StageSplit {
  label: string;
  pct: number;
}

function stageLines(totalPence: number, stages: StageSplit[], margin: number): GeneratedLine[] {
  return stages.map((s) => ({
    kind: 'fixed' as EstimateLineKind,
    description: `${s.label} (allowance)`,
    quantity: 1,
    unit: 'job',
    unit_cost_pence: Math.round((totalPence * s.pct) / 100),
    markup_percent: margin,
    source_code: null,
  }));
}

export type ExtensionTier = 'basic' | 'standard' | 'premium';

export interface ExtensionInputs {
  area_m2: number;
  spec_tier: ExtensionTier;
  margin_percent: number;
}

export const EXTENSION_STAGES: StageSplit[] = [
  { label: 'Foundations & groundwork', pct: 18 },
  { label: 'Superstructure — walls, steels & roof structure', pct: 30 },
  { label: 'Roof covering & rainwater', pct: 8 },
  { label: 'Windows, doors & glazing', pct: 12 },
  { label: 'First fix — electrics, plumbing & insulation', pct: 12 },
  { label: 'Plastering & screed', pct: 8 },
  { label: 'Second fix & decoration', pct: 8 },
  { label: 'Prelims, scaffold & waste', pct: 4 },
];

function generateExtension(inputs: ExtensionInputs, book: PriceBook): GenerateResult {
  const area = Math.max(0, num(inputs.area_m2));
  const tier: ExtensionTier =
    inputs.spec_tier === 'basic' || inputs.spec_tier === 'premium'
      ? inputs.spec_tier
      : 'standard';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  if (area <= 0)
    return { lines: [], warnings: ['Enter the extension floor area.'], priced_on: null };
  const rate = findMaterial(book, `EXT-${tier.toUpperCase()}`);
  if (!rate)
    return { lines: [], warnings: ['Extension build rate missing.'], priced_on: null };
  const total = Math.round(rate.base_unit_cost_pence * area);
  return {
    lines: stageLines(total, EXTENSION_STAGES, margin),
    warnings: ['Excludes kitchen/bathroom fit-out, VAT, and design/planning fees.'],
    priced_on: rate.priced_on,
    uncertainty: 0.2,
  };
}

export type LoftType = 'rooflight' | 'dormer' | 'hip_to_gable' | 'mansard';

export interface LoftInputs {
  loft_type: LoftType;
  ensuite: boolean;
  margin_percent: number;
}

export const LOFT_STAGES: StageSplit[] = [
  { label: 'Structural — floor, steels & dormer', pct: 30 },
  { label: 'Roofing & insulation', pct: 15 },
  { label: 'Staircase', pct: 8 },
  { label: 'First fix — electrics & plumbing', pct: 12 },
  { label: 'Plastering', pct: 10 },
  { label: 'Second fix & finishes', pct: 15 },
  { label: 'Building control, scaffold & prelims', pct: 10 },
];

function generateLoft(inputs: LoftInputs, book: PriceBook): GenerateResult {
  const type: LoftType = (['rooflight', 'dormer', 'hip_to_gable', 'mansard'] as LoftType[]).includes(
    inputs.loft_type,
  )
    ? inputs.loft_type
    : 'dormer';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  const codeMap: Record<LoftType, string> = {
    rooflight: 'LOFT-ROOFLIGHT',
    dormer: 'LOFT-DORMER',
    hip_to_gable: 'LOFT-HIP-GABLE',
    mansard: 'LOFT-MANSARD',
  };
  const rate = findMaterial(book, codeMap[type]);
  if (!rate) return { lines: [], warnings: ['Loft rate missing.'], priced_on: null };
  const lines = stageLines(rate.base_unit_cost_pence, LOFT_STAGES, margin);
  let pricedOn: string | null = rate.priced_on;
  if (inputs.ensuite) {
    const ens = findMaterial(book, 'LOFT-ENSUITE');
    if (ens) {
      lines.push({
        kind: 'fixed',
        description: 'Ensuite bathroom (allowance)',
        quantity: 1,
        unit: 'job',
        unit_cost_pence: ens.base_unit_cost_pence,
        markup_percent: margin,
        source_code: ens.code,
      });
      pricedOn = olderDate(pricedOn, ens.priced_on);
    }
  }
  return {
    lines,
    warnings: ['Excludes VAT and design/planning/Building-Control fees.'],
    priced_on: pricedOn,
    uncertainty: 0.2,
  };
}

export type KitchenTier = 'budget' | 'mid' | 'premium';

export interface KitchenInputs {
  tier: KitchenTier;
  margin_percent: number;
}

export const KITCHEN_STAGES: StageSplit[] = [
  { label: 'Strip-out', pct: 6 },
  { label: 'Units & installation', pct: 34 },
  { label: 'Worktops', pct: 12 },
  { label: 'Appliances', pct: 16 },
  { label: 'Electrics & plumbing', pct: 14 },
  { label: 'Tiling & splashback', pct: 6 },
  { label: 'Flooring', pct: 6 },
  { label: 'Plastering & decoration', pct: 6 },
];

function generateKitchen(inputs: KitchenInputs, book: PriceBook): GenerateResult {
  const tier: KitchenTier =
    inputs.tier === 'mid' || inputs.tier === 'premium' ? inputs.tier : 'budget';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  const rate = findMaterial(book, `KITCHEN-${tier.toUpperCase()}`);
  if (!rate) return { lines: [], warnings: ['Kitchen rate missing.'], priced_on: null };
  return {
    lines: stageLines(rate.base_unit_cost_pence, KITCHEN_STAGES, margin),
    warnings: ['Excludes VAT; assumes same layout (no wall moves).'],
    priced_on: rate.priced_on,
    uncertainty: 0.2,
  };
}

export type RewireBeds = '1' | '2' | '3' | '4' | '5';

export interface RewireInputs {
  bedrooms: RewireBeds;
  plaster_making_good: boolean;
  margin_percent: number;
}

export const REWIRE_STAGES: StageSplit[] = [
  { label: 'First fix — cabling & back boxes', pct: 45 },
  { label: 'Second fix — accessories & fit-off', pct: 25 },
  { label: 'Consumer unit & earthing', pct: 15 },
  { label: 'Testing & certification (EIC)', pct: 15 },
];

function generateRewire(inputs: RewireInputs, book: PriceBook): GenerateResult {
  const beds: RewireBeds = (['1', '2', '3', '4', '5'] as RewireBeds[]).includes(
    inputs.bedrooms,
  )
    ? inputs.bedrooms
    : '3';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  const rate = findMaterial(book, `REWIRE-${beds}BED`);
  if (!rate) return { lines: [], warnings: ['Rewire rate missing.'], priced_on: null };
  const base = rate.base_unit_cost_pence;
  const lines = stageLines(base, REWIRE_STAGES, margin);
  if (inputs.plaster_making_good) {
    lines.push({
      kind: 'fixed',
      description: 'Plaster making-good & redecoration (allowance)',
      quantity: 1,
      unit: 'job',
      unit_cost_pence: Math.round(base * 0.35),
      markup_percent: margin,
      source_code: null,
    });
  }
  return {
    lines,
    warnings: ['Excludes VAT. Electrical-only unless plaster making-good is included.'],
    priced_on: rate.priced_on,
    uncertainty: 0.2,
  };
}

export type ElecBoilerBand = 'small' | 'medium' | 'large';

export interface ElectricBoilerInputs {
  size_band: ElecBoilerBand;
  margin_percent: number;
}

function generateElectricBoiler(inputs: ElectricBoilerInputs, book: PriceBook): GenerateResult {
  const band: ElecBoilerBand =
    inputs.size_band === 'small' || inputs.size_band === 'large' ? inputs.size_band : 'medium';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  const lines: GeneratedLine[] = [];
  const warnings: string[] = [];
  let pricedOn: string | null = null;
  const push = (l: GeneratedLine, w: string | null) => {
    lines.push(l);
    pricedOn = olderDate(pricedOn, w);
  };
  const bandLabel =
    band === 'small' ? '6–9 kW (1–2 bed)' : band === 'large' ? '12–15 kW (4+ bed)' : '9–12 kW (3 bed)';
  const boiler = findMaterial(book, `ELEC-BOILER-${band.toUpperCase()}`);
  if (boiler)
    push(
      { kind: 'material', description: `Electric boiler ${bandLabel} (supply)`, quantity: 1, unit: 'each', unit_cost_pence: boiler.base_unit_cost_pence, markup_percent: margin, source_code: boiler.code },
      boiler.priced_on,
    );
  else warnings.push('Electric boiler price missing — add manually.');
  const sundries = findMaterial(book, 'ELEC-BOILER-SUNDRIES');
  if (sundries)
    push(
      { kind: 'material', description: sundries.name, quantity: 1, unit: 'job', unit_cost_pence: sundries.base_unit_cost_pence, markup_percent: margin, source_code: sundries.code },
      sundries.priced_on,
    );
  const eng = findLabour(book, 'gas_engineer', 'day');
  if (eng)
    push(
      { kind: 'labour_day_rate', description: 'Heating engineer labour — electric boiler install', quantity: 1.5, unit: 'day', unit_cost_pence: eng.base_rate_pence, markup_percent: margin, source_code: null },
      eng.priced_on,
    );
  else warnings.push('Engineer day rate missing — add manually.');
  return { lines, warnings, priced_on: pricedOn, uncertainty: 0.12 };
}

export type RenoScope = 'light' | 'standard' | 'full_gut';

export interface RenovationInputs {
  area_m2: number;
  scope_tier: RenoScope;
  margin_percent: number;
}

export const RENOVATION_STAGES: StageSplit[] = [
  { label: 'Strip-out & prep', pct: 8 },
  { label: 'Builders work & structural', pct: 12 },
  { label: 'Electrical rewire', pct: 14 },
  { label: 'Plumbing & heating', pct: 14 },
  { label: 'Plastering', pct: 12 },
  { label: 'Joinery — doors, skirting & stairs', pct: 8 },
  { label: 'Kitchen & bathrooms allowance', pct: 14 },
  { label: 'Flooring', pct: 6 },
  { label: 'Decoration', pct: 8 },
  { label: 'Prelims, skip & scaffold', pct: 4 },
];

function generateRenovation(inputs: RenovationInputs, book: PriceBook): GenerateResult {
  const area = Math.max(0, num(inputs.area_m2));
  const tier: RenoScope =
    inputs.scope_tier === 'light' || inputs.scope_tier === 'full_gut'
      ? inputs.scope_tier
      : 'standard';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  if (area <= 0) return { lines: [], warnings: ['Enter the floor area.'], priced_on: null };
  const rate = findMaterial(book, `RENO-${tier === 'full_gut' ? 'FULLGUT' : tier.toUpperCase()}`);
  if (!rate) return { lines: [], warnings: ['Renovation rate missing.'], priced_on: null };
  const total = Math.round(rate.base_unit_cost_pence * area);
  return {
    lines: stageLines(total, RENOVATION_STAGES, margin),
    warnings: ['Excludes VAT, professional fees and contingency (allow 10–15%).'],
    priced_on: rate.priced_on,
    uncertainty: 0.25,
  };
}

export type BathTier = 'budget' | 'mid' | 'premium';

export interface BathroomInputs {
  tier: BathTier;
  margin_percent: number;
}

export const BATHROOM_STAGES: StageSplit[] = [
  { label: 'Strip-out', pct: 10 },
  { label: 'First fix — plumbing & electrics', pct: 18 },
  { label: 'Tanking & tiling', pct: 25 },
  { label: 'Sanitaryware & brassware', pct: 22 },
  { label: 'Second fix & sealing', pct: 10 },
  { label: 'Plastering & decoration', pct: 10 },
  { label: 'Waste & sundries', pct: 5 },
];

function generateBathroom(inputs: BathroomInputs, book: PriceBook): GenerateResult {
  const tier: BathTier =
    inputs.tier === 'mid' || inputs.tier === 'premium' ? inputs.tier : 'budget';
  const margin = Math.max(0, num(inputs.margin_percent, 0));
  const rate = findMaterial(book, `BATH-${tier.toUpperCase()}`);
  if (!rate) return { lines: [], warnings: ['Bathroom rate missing.'], priced_on: null };
  return {
    lines: stageLines(rate.base_unit_cost_pence, BATHROOM_STAGES, margin),
    warnings: ['Excludes VAT; assumes same-footprint refit (no major layout change).'],
    priced_on: rate.priced_on,
    uncertainty: 0.2,
  };
}

// --- boiler replacement (INDICATIVE guideline) -----------------------------

export type BoilerType = 'combi' | 'system';
export type BoilerTier = 'budget' | 'mid' | 'premium';
export type PropertySize = 'small' | 'medium' | 'large';

export interface BoilerInputs {
  boiler_type: BoilerType;
  tier: BoilerTier;
  property_size: PropertySize;
  powerflush: boolean;
  radiators: number;
  magnetic_filter: boolean;
  smart_controls: boolean;
  margin_percent: number;
}

/**
 * Boiler-replacement labour + powerflush norms (UK 2026 trade/cost guides:
 * Checkatrade, MyJobQuote, iHeat). A guideline, not a fixed price — surfaced
 * with a ± range and an "indicative" banner.
 */
export const BOILER_ASSUMPTIONS = {
  /** Gas engineer days by install type. */
  days: { combi: 1.5, system: 2.5 } as Record<BoilerType, number>,
  /** Extra days for a larger property (more pipework/rads). */
  size_extra_days: { small: 0, medium: 0, large: 0.5 } as Record<PropertySize, number>,
  /** Power flush charged per radiator (pence, ex-VAT ~£30/rad). */
  powerflush_pence_per_rad: 3000,
  /** Guideline spread shown to the builder/client. */
  uncertainty: 0.12,
} as const;

function generateBoiler(inputs: BoilerInputs, book: PriceBook): GenerateResult {
  const warnings: string[] = [];
  const lines: GeneratedLine[] = [];
  let pricedOn: string | null = null;
  const A = BOILER_ASSUMPTIONS;

  const type: BoilerType = inputs.boiler_type === 'system' ? 'system' : 'combi';
  const tier: BoilerTier =
    inputs.tier === 'mid' || inputs.tier === 'premium' ? inputs.tier : 'budget';
  const size: PropertySize =
    inputs.property_size === 'medium' || inputs.property_size === 'large'
      ? inputs.property_size
      : 'small';
  const margin = Math.max(0, num(inputs.margin_percent, 0));

  function push(line: GeneratedLine, when: string | null) {
    lines.push(line);
    pricedOn = olderDate(pricedOn, when);
  }
  function mat(code: string, desc: string, qty = 1, unit = 'each') {
    const m = findMaterial(book, code);
    if (!m) {
      warnings.push(`${desc} price missing — add it manually.`);
      return;
    }
    push(
      {
        kind: 'material',
        description: desc,
        quantity: qty,
        unit,
        unit_cost_pence: m.base_unit_cost_pence,
        markup_percent: margin,
        source_code: m.code,
      },
      m.priced_on,
    );
  }

  const tierLabel = tier === 'budget' ? 'Budget' : tier === 'mid' ? 'Mid-range' : 'Premium';
  mat(
    `BOILER-${tier.toUpperCase()}`,
    `${tierLabel} ${type === 'system' ? 'system' : 'combi'} boiler (supply)`,
  );
  if (type === 'system') mat('CYLINDER-UNVENTED', 'Unvented hot water cylinder (supply)');
  mat('BOILER-SUNDRIES', 'Flue, fittings & pipework sundries', 1, 'job');
  if (inputs.magnetic_filter) mat('MAG-FILTER', 'Magnetic system filter (supply & fit)');
  if (inputs.smart_controls) mat('SMART-CONTROLS', 'Smart heating controls (supply)');

  if (inputs.powerflush) {
    const rads = Math.max(1, Math.round(num(inputs.radiators, 8)));
    push(
      {
        kind: 'other',
        description: `Power flush — ${rads} radiator${rads > 1 ? 's' : ''}`,
        quantity: rads,
        unit: 'radiator',
        unit_cost_pence: A.powerflush_pence_per_rad,
        markup_percent: margin,
        source_code: null,
      },
      null,
    );
  }

  const engineer = findLabour(book, 'gas_engineer', 'day');
  if (engineer) {
    const days = A.days[type] + A.size_extra_days[size];
    push(
      {
        kind: 'labour_day_rate',
        description: `Gas engineer labour — ${type === 'system' ? 'system boiler' : 'combi'} install`,
        quantity: days,
        unit: 'day',
        unit_cost_pence: engineer.base_rate_pence,
        markup_percent: margin,
        source_code: null,
      },
      engineer.priced_on,
    );
  } else {
    warnings.push('Gas engineer day rate missing — add your labour manually.');
  }

  return { lines, warnings, priced_on: pricedOn, uncertainty: A.uncertainty };
}

// --- public entry point -----------------------------------------------------

// --- per-tenant price overrides --------------------------------------------

export interface MaterialOverride {
  code: string;
  unit_cost_pence: number;
  priced_on: string;
}
export interface LabourOverride {
  trade: string;
  unit: string;
  base_rate_pence: number;
  priced_on: string;
}

/**
 * Apply a builder's own saved prices over the platform catalogue. Overridden
 * rows get the tenant's price, a "Your saved price" source, and the tenant's
 * date — so the generator (unchanged) quotes with their numbers, and the
 * "priced as of" line reflects when they last set them.
 */
export function mergePriceBook(
  base: PriceBook,
  materialOverrides: MaterialOverride[],
  labourOverrides: LabourOverride[],
): PriceBook {
  const mat = new Map(materialOverrides.map((o) => [o.code, o]));
  const lab = new Map(labourOverrides.map((o) => [`${o.trade}|${o.unit}`, o]));
  return {
    materials: base.materials.map((m) => {
      const o = mat.get(m.code);
      return o
        ? { ...m, base_unit_cost_pence: o.unit_cost_pence, source: 'Your saved price', priced_on: o.priced_on }
        : m;
    }),
    labour: base.labour.map((l) => {
      const o = lab.get(`${l.trade}|${l.unit}`);
      return o
        ? { ...l, base_rate_pence: o.base_rate_pence, source: 'Your saved price', priced_on: o.priced_on }
        : l;
    }),
  };
}

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
    case 'kitchen_refit':
      return generateKitchen(
        { tier: (inputs.tier as KitchenTier) ?? 'mid', margin_percent: num(inputs.margin_percent, 0) },
        book,
      );
    case 'electrical_rewire':
      return generateRewire(
        {
          bedrooms: (String(inputs.bedrooms) as RewireBeds) ?? '3',
          plaster_making_good: inputs.plaster_making_good !== false,
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'electric_boiler':
      return generateElectricBoiler(
        {
          size_band: (inputs.size_band as ElecBoilerBand) ?? 'medium',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'full_renovation':
      return generateRenovation(
        {
          area_m2: num(inputs.area_m2),
          scope_tier: (inputs.scope_tier as RenoScope) ?? 'standard',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'bathroom_refit':
      return generateBathroom(
        {
          tier: (inputs.tier as BathTier) ?? 'mid',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'extension_single_storey':
      return generateExtension(
        {
          area_m2: num(inputs.area_m2),
          spec_tier: (inputs.spec_tier as ExtensionTier) ?? 'standard',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'loft_conversion':
      return generateLoft(
        {
          loft_type: (inputs.loft_type as LoftType) ?? 'dormer',
          ensuite: inputs.ensuite === true,
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'boiler_replacement':
      return generateBoiler(
        {
          boiler_type: (inputs.boiler_type as BoilerType) ?? 'combi',
          tier: (inputs.tier as BoilerTier) ?? 'budget',
          property_size: (inputs.property_size as PropertySize) ?? 'medium',
          powerflush: inputs.powerflush === true,
          radiators: num(inputs.radiators, 8),
          magnetic_filter: inputs.magnetic_filter !== false,
          smart_controls: inputs.smart_controls === true,
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'paving':
      return generatePaving(
        {
          area_m2: num(inputs.area_m2),
          surface_type: (inputs.surface_type as PaveSurface) ?? 'block',
          new_subbase: inputs.new_subbase !== false,
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'fencing':
      return generateFencing(
        {
          length_m: num(inputs.length_m),
          fence_type: (inputs.fence_type as FenceType) ?? 'lap_timber',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'turfing':
      return generateTurfing(
        {
          area_m2: num(inputs.area_m2),
          ground_prep: inputs.ground_prep !== false,
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'decking':
      return generateDecking(
        {
          area_m2: num(inputs.area_m2),
          deck_type: (inputs.deck_type as DeckType) ?? 'softwood',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'bricklaying':
      return generateBricklaying(
        {
          area_m2: num(inputs.area_m2),
          wall_type: (inputs.wall_type as WallType) ?? 'single',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'flooring':
      return generateFlooring(
        {
          area_m2: num(inputs.area_m2),
          floor_type: (inputs.floor_type as FloorType) ?? 'laminate',
          underlay: inputs.underlay !== false,
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'tiling':
      return generateTiling(
        {
          area_m2: num(inputs.area_m2),
          surface: (inputs.surface as TileSurface) ?? 'wall',
          tile_tier: (inputs.tile_tier as TileTier) ?? 'mid',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
    case 'plastering':
      return generatePlastering(
        {
          area_m2: num(inputs.area_m2),
          job_type: (inputs.job_type as PlasteringJob) ?? 'skim',
          margin_percent: num(inputs.margin_percent, 0),
        },
        book,
      );
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
