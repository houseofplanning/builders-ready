import type { StageStatus } from '@br/shared';

const STAGE_STYLES: Record<
  StageStatus,
  { label: string; bg: string; fg: string }
> = {
  not_started: { label: 'Not started', bg: '#EDF0F2', fg: '#5F7480' },
  in_progress: { label: 'In progress', bg: 'rgba(31,78,121,0.08)', fg: '#1F4E79' },
  complete: { label: 'Complete', bg: 'rgba(46,125,50,0.08)', fg: '#2E7D32' },
  delayed: { label: 'Delayed', bg: 'rgba(176,50,43,0.08)', fg: '#B0322B' },
};

export function StagePill({ status }: { status: StageStatus }) {
  const s = STAGE_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

const PROJECT_STYLES: Record<
  'active' | 'on_hold' | 'completed' | 'archived',
  { label: string; bg: string; fg: string }
> = {
  active: { label: 'Active', bg: 'rgba(46,125,50,0.1)', fg: '#2E7D32' },
  on_hold: { label: 'On hold', bg: 'rgba(178,106,0,0.1)', fg: '#B26A00' },
  completed: { label: 'Completed', bg: '#EDF0F2', fg: '#5F7480' },
  archived: { label: 'Archived', bg: '#EDF0F2', fg: '#5F7480' },
};

export function ProjectStatusPill({
  status,
}: {
  status: 'active' | 'on_hold' | 'completed' | 'archived';
}) {
  const s = PROJECT_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
