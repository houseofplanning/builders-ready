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

import type { EstimateClientDetail, EstimateLineKind, VatMode } from './types';

/** The minimum a line needs for the maths — the editor row satisfies this. */
export interface EstimateLineMathInput {
  quantity: number;
  unit_cost_pence: number;
  markup_percent: number;
  /** Provided by the client — excluded from cost and price. */
  client_supplied?: boolean;
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

/** Round to 2 decimals, matching the DB's numeric(_,2) storage for quantity
 *  and markup_percent, so the app's live total always equals what Postgres
 *  recomputes in the generated columns (no sub-penny drift). */
function round2(v: unknown): number {
  return Math.round(toNumber(v) * 100) / 100;
}

export function lineCostPence(line: EstimateLineMathInput): number {
  return Math.round(round2(line.quantity) * toNumber(line.unit_cost_pence));
}

export function linePricePence(line: EstimateLineMathInput): number {
  return Math.round(
    round2(line.quantity) *
      toNumber(line.unit_cost_pence) *
      (1 + round2(line.markup_percent) / 100),
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
    if (line.client_supplied) continue; // provided by the client — not charged
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

export const CLIENT_DETAIL_LABELS: Record<EstimateClientDetail, string> = {
  itemised: 'Every line',
  grouped: 'Materials & labour subtotals',
  total: 'Single total only',
};

/** A line as the CLIENT sees it. */
export interface ClientLineInput {
  description: string;
  kind: EstimateLineKind;
  line_price_pence: number;
  client_supplied?: boolean;
}

export interface ClientBreakdownRow {
  label: string;
  price_pence: number;
}

export interface ClientBreakdown {
  /** The priced rows to show the client (shape depends on detail level). */
  rows: ClientBreakdownRow[];
  /** Descriptions of lines the client is providing themselves (no price). */
  client_supplied: string[];
}

/** Which group a line falls into for the 'grouped' client view. */
function lineGroup(kind: EstimateLineKind): 'Materials' | 'Labour' | 'Other' {
  if (kind === 'material') return 'Materials';
  if (kind === 'labour_day_rate' || kind === 'labour_hourly') return 'Labour';
  return 'Other';
}

/**
 * Build the breakdown the CLIENT sees, honouring the quote's detail level.
 * Client-supplied lines never carry a price; they're listed separately as
 * provided-by-client. The VAT/total block is unaffected (it comes from the
 * stored estimate totals, which already exclude client-supplied lines).
 */
export function clientFacingBreakdown(
  lines: ClientLineInput[],
  level: EstimateClientDetail,
): ClientBreakdown {
  const client_supplied = lines
    .filter((l) => l.client_supplied)
    .map((l) => l.description);
  const charged = lines.filter((l) => !l.client_supplied);

  if (level === 'itemised') {
    return {
      rows: charged.map((l) => ({
        label: l.description,
        price_pence: l.line_price_pence,
      })),
      client_supplied,
    };
  }

  if (level === 'grouped') {
    const order: ('Materials' | 'Labour' | 'Other')[] = ['Materials', 'Labour', 'Other'];
    const sums: Record<string, number> = {};
    for (const l of charged) {
      const g = lineGroup(l.kind);
      sums[g] = (sums[g] ?? 0) + l.line_price_pence;
    }
    return {
      rows: order
        .filter((g) => (sums[g] ?? 0) > 0)
        .map((g) => ({ label: g, price_pence: sums[g] })),
      client_supplied,
    };
  }

  // 'total' — a single all-in figure.
  const total = charged.reduce((a, l) => a + l.line_price_pence, 0);
  return {
    rows: [{ label: 'Works — all-in (ex-VAT)', price_pence: total }],
    client_supplied,
  };
}

/** Wording to print on the estimate/PDF for each VAT mode. */
export const VAT_MODE_NOTE: Record<VatMode, string | null> = {
  none: null,
  standard: null,
  reverse_charge:
    'VAT to be accounted for by the customer under the CIS domestic reverse charge.',
};
