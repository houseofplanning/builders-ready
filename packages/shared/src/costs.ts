/**
 * Cost & margin maths — shared by mobile and web.
 *
 * Margin is computed against CONTRACT VALUE (original quote + signed
 * variations), not invoiced-to-date. All money is integer pence. Costs and
 * margin are owner/PM-only; never surface these to a client.
 */

import type { CostCategory } from './types';

export const COST_CATEGORIES: CostCategory[] = [
  'materials',
  'labour',
  'plant_hire',
  'subcontractor',
  'other',
];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  materials: 'Materials',
  labour: 'Labour',
  plant_hire: 'Plant / hire',
  subcontractor: 'Subcontractor',
  other: 'Other',
};

export interface MarginSummary {
  /** Original quote + signed variations. */
  contract_value_pence: number;
  /** Sum of logged actual costs. */
  cost_to_date_pence: number;
  /** contract_value − cost_to_date. */
  margin_pence: number;
  /** margin ÷ contract_value × 100 (0 when no contract value). */
  margin_percent: number;
  /** Budgeted cost from the linked quote, if the project came from one. */
  budgeted_cost_pence: number | null;
  /** actual − budgeted (positive = over budget), or null if no budget. */
  cost_variance_pence: number | null;
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function computeMargin(
  contractValuePence: number,
  costToDatePence: number,
  budgetedCostPence: number | null = null,
): MarginSummary {
  const contract = toNum(contractValuePence);
  const cost = toNum(costToDatePence);
  const margin = contract - cost;
  return {
    contract_value_pence: contract,
    cost_to_date_pence: cost,
    margin_pence: margin,
    margin_percent: contract > 0 ? (margin / contract) * 100 : 0,
    budgeted_cost_pence: budgetedCostPence,
    cost_variance_pence:
      budgetedCostPence != null ? cost - toNum(budgetedCostPence) : null,
  };
}

/** Sum a list of cost rows into a total and a per-category breakdown. */
export function summariseCosts(
  costs: { category: CostCategory; amount_pence: number }[],
): { total_pence: number; by_category: Record<CostCategory, number> } {
  const by_category: Record<CostCategory, number> = {
    materials: 0,
    labour: 0,
    plant_hire: 0,
    subcontractor: 0,
    other: 0,
  };
  let total = 0;
  for (const c of costs) {
    const amt = toNum(c.amount_pence);
    total += amt;
    by_category[c.category] = (by_category[c.category] ?? 0) + amt;
  }
  return { total_pence: total, by_category };
}
