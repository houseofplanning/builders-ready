/**
 * Default 8-stage template for a premium-residential project.
 *
 * Names chosen to fit UK builder vocabulary; tenants/PMs can rename
 * per project after creation. Each stage gets a date band proportional
 * to its weight (so larger phases like Structure get more days than
 * Snagging). Weights sum to 100.
 */

export interface DefaultStage {
  name: string;
  weight: number; // 0-100, sums to 100 across the template
}

export const DEFAULT_STAGES: readonly DefaultStage[] = [
  { name: 'Mobilisation', weight: 5 },
  { name: 'Strip-out & Demolition', weight: 10 },
  { name: 'Structure', weight: 20 },
  { name: 'First Fix', weight: 18 },
  { name: 'Plastering', weight: 12 },
  { name: 'Second Fix', weight: 15 },
  { name: 'Decoration & Finishes', weight: 12 },
  { name: 'Snagging & Handover', weight: 8 },
];

export interface StageRange {
  position: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  target_end_date: string;
}

/**
 * Spread the default stages proportionally across the project's start
 * and end dates. Returns the 8 stage rows ready to insert.
 */
export function distributeStages(
  startISO: string,
  endISO: string,
): StageRange[] {
  const start = new Date(startISO + 'T00:00:00Z').getTime();
  const end = new Date(endISO + 'T00:00:00Z').getTime();
  const span = Math.max(0, end - start);
  const totalWeight = DEFAULT_STAGES.reduce((s, d) => s + d.weight, 0);

  let cursor = start;
  return DEFAULT_STAGES.map((s, i) => {
    const stageMs = (s.weight / totalWeight) * span;
    const stageStart = i === 0 ? start : cursor;
    const stageEnd =
      i === DEFAULT_STAGES.length - 1
        ? end
        : Math.round(stageStart + stageMs);
    cursor = stageEnd;
    return {
      position: i + 1,
      name: s.name,
      start_date: isoDate(stageStart),
      target_end_date: isoDate(stageEnd),
    };
  });
}

function isoDate(ms: number): string {
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}
