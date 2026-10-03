/**
 * Contract & payment-schedule maths — shared by mobile and web.
 *
 * Each milestone is either a fixed pence amount OR a percent of the contract
 * sum. Retention is a milestone flagged is_retention (held back, released
 * after snagging). All money is integer pence.
 */

export interface MilestoneAmountInput {
  percent: number | null;
  amount_pence: number | null;
}

export function milestoneAmountPence(
  contractSumPence: number,
  m: MilestoneAmountInput,
): number {
  if (m.amount_pence != null && Number.isFinite(m.amount_pence)) {
    return Math.max(0, Math.round(m.amount_pence));
  }
  if (m.percent != null && Number.isFinite(m.percent)) {
    return Math.round((contractSumPence * m.percent) / 100);
  }
  return 0;
}

export interface ScheduleSummary {
  /** Sum of every milestone's amount. */
  scheduled_total_pence: number;
  /** Sum of milestones flagged as retention. */
  retention_pence: number;
  /** scheduled_total − contract_sum (0 = the schedule balances). */
  difference_pence: number;
}

export function summariseSchedule(
  contractSumPence: number,
  milestones: (MilestoneAmountInput & { is_retention: boolean })[],
): ScheduleSummary {
  let total = 0;
  let retention = 0;
  for (const m of milestones) {
    const amt = milestoneAmountPence(contractSumPence, m);
    total += amt;
    if (m.is_retention) retention += amt;
  }
  return {
    scheduled_total_pence: total,
    retention_pence: retention,
    difference_pence: total - contractSumPence,
  };
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatusLite, string> = {
  draft: 'Draft',
  sent: 'Awaiting signature',
  signed: 'Signed',
};

// Local alias to avoid importing the type (keeps this file dependency-free).
type ContractStatusLite = 'draft' | 'sent' | 'signed';
