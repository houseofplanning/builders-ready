/**
 * Estimate money maths — the single source of truth shared by mobile and web.
 *
 * These must match the DB generated columns on estimate_line_items:
 *   line_cost_pence  = round(quantity * unit_cost_pence)
 *   line_price_pence = round(quantity * unit_cost_pence * (1 + markup_percent/100))
 * so the app's live preview always agrees with what Postgres stores. We round
 * PER LINE and then sum (never sum-then-round), exactly like the DB does.
 *
 * All money is integer pence. Quantities/markups are plain numbers.
 */

import type { EstimateLineKind, VatMode } from './types';

/** The minimum a line needs for the maths — the editor row satisfies this. */
export interface EstimateLineMathInput {
  quantity: number;
  unit_cost_pence: number;
  markup_percent: number;
}

export interface EstimateTotals {
  /** Sum of line costs (what the job costs the builder). */
  cost_subtotal_pence: number;
  /** Sum of line prices, ex-VAT (what the client is quoted before VAT). */
  subtotal_pence: number;
  /** VAT added — only when vatMode === 'standard'. */
  vat_pence: number;
  /** subtotal + VAT — the headline quote figure. */
  total_pence: number;
  /** subtotal − cost: the builder's margin in pence (ex-VAT). */
  margin_pence: number;
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function lineCostPence(line: EstimateLineMathInput): number {
  return Math.round(toNumber(line.quantity) * toNumber(line.unit_cost_pence));
}

export function linePricePence(line: EstimateLineMathInput): number {
  return Math.round(
    toNumber(line.quantity) *
      toNumber(line.unit_cost_pence) *
      (1 + toNumber(line.markup_percent) / 100),
  );
}

export function computeEstimateTotals(
  lines: EstimateLineMathInput[],
  vatMode: VatMode,
  vatRateBp: number,
): EstimateTotals {
  let cost = 0;
  let price = 0;
  for (const line of lines) {
    cost += lineCostPence(line);
    price += linePricePence(line);
  }
  const vat =
    vatMode === 'standard' ? Math.round((price * toNumber(vatRateBp)) / 10000) : 0;
  return {
    cost_subtotal_pence: cost,
    subtotal_pence: price,
    vat_pence: vat,
    total_pence: price + vat,
    margin_pence: price - cost,
  };
}

/** Margin as a percentage of the ex-VAT sell price (0 when nothing sold). */
export function marginPercent(totals: EstimateTotals): number {
  if (totals.subtotal_pence <= 0) return 0;
  return (totals.margin_pence / totals.subtotal_pence) * 100;
}

export const ESTIMATE_LINE_KIND_LABELS: Record<EstimateLineKind, string> = {
  material: 'Materials',
  labour_day_rate: 'Labour · day rate',
  labour_hourly: 'Labour · hourly',
  fixed: 'Fixed price',
  other: 'Other',
};

/** Sensible default unit per line kind, used when adding a fresh line. */
export const ESTIMATE_LINE_KIND_DEFAULT_UNIT: Record<EstimateLineKind, string> = {
  material: 'each',
  labour_day_rate: 'day',
  labour_hourly: 'hour',
  fixed: 'job',
  other: 'each',
};

export const VAT_MODE_LABELS: Record<VatMode, string> = {
  none: 'Not VAT registered',
  standard: 'Standard VAT',
  reverse_charge: 'CIS domestic reverse charge',
};

/** Wording to print on the estimate/PDF for each VAT mode. */
export const VAT_MODE_NOTE: Record<VatMode, string | null> = {
  none: null,
  standard: null,
  reverse_charge:
    'VAT to be accounted for by the customer under the CIS domestic reverse charge.',
};
