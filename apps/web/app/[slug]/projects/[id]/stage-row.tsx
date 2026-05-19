'use client';

import { useState, useTransition } from 'react';
import type { ProjectStage, StageStatus } from '@br/shared';
import { formatDate } from '@br/shared';
import { updateStageStatus } from '@/lib/server-actions/stages';
import { StagePill } from '@/components/status-pill';

interface Props {
  stage: ProjectStage;
  isLast: boolean;
  canWrite: boolean;
}

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'delayed', label: 'Delayed' },
];

export function StageRow({ stage, isLast, canWrite }: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<StageStatus>(stage.status);
  const [error, setError] = useState<string | null>(null);

  function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as StageStatus;
    setError(null);
    setStatus(next);
    startTransition(async () => {
      const res = await updateStageStatus({
        stage_id: stage.id,
        status: next,
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed to update.');
        setStatus(stage.status); // revert
      }
    });
  }

  return (
    <li className="relative grid grid-cols-[28px_1fr_auto] items-start gap-3 px-5 py-4">
      {/* dot + connector line */}
      <div className="relative pt-0.5">
        <div
          className="relative z-10 h-5 w-5 rounded-full border-2"
          style={{
            background:
              status === 'complete'
                ? 'var(--br-primary)'
                : status === 'in_progress'
                  ? 'var(--br-accent)'
                  : '#fff',
            borderColor:
              status === 'complete' || status === 'in_progress'
                ? 'transparent'
                : 'var(--br-hairline)',
          }}
        />
        {!isLast && (
          <div
            className="absolute left-2 top-5 -ml-px h-[calc(100%+1.5rem)] w-px"
            style={{ background: 'var(--br-hairline)' }}
          />
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">{stage.name}</span>
          <StagePill status={status} />
        </div>
        <div className="mt-1 text-[11px] text-ink-muted">
          {formatDate(stage.start_date, { short: true })} →{' '}
          {formatDate(
            stage.actual_end_date ?? stage.target_end_date,
            { short: true },
          )}
          {stage.actual_end_date && ' · actual'}
        </div>
        {error && (
          <div className="mt-1 text-[11px] text-error">{error}</div>
        )}
      </div>

      <div>
        {canWrite ? (
          <select
            value={status}
            disabled={pending}
            onChange={onStatusChange}
            className="rounded-md border border-hairline bg-white px-2 py-1 text-xs font-semibold focus:border-primary focus:outline-none disabled:opacity-60"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[11px] text-ink-muted">{stage.position}/8</span>
        )}
      </div>
    </li>
  );
}
