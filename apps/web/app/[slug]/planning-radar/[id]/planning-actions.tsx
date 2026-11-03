'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPlanningStageOnWeb } from '@/lib/server-actions/planning';

const STAGES: { key: string; label: string }[] = [
  { key: 'saved', label: 'Saved' },
  { key: 'approached', label: 'Approached' },
  { key: 'replied', label: 'Replied' },
  { key: 'won', label: 'Won' },
];

export function PlanningActions({
  listingId,
  initialStage,
}: {
  listingId: string;
  initialStage: string | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<string | null>(initialStage);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(next: string) {
    const prev = stage;
    setStage(next);
    setError(null);
    startTransition(async () => {
      const res = await setPlanningStageOnWeb(listingId, next);
      if (!res.ok) {
        setStage(prev);
        setError(res.error ?? 'Could not save.');
      }
    });
  }

  function dismiss() {
    setError(null);
    startTransition(async () => {
      const res = await setPlanningStageOnWeb(listingId, 'not_interested');
      if (res.ok) router.back();
      else setError(res.error ?? 'Could not save.');
    });
  }

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Track this job</div>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => apply(s.key)}
            disabled={pending}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${
              stage === s.key ? 'border-primary bg-primary text-white' : 'border-hairline bg-white text-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button onClick={dismiss} disabled={pending} className="mt-3 text-sm font-semibold text-ink-muted hover:text-ink">
        Not interested — hide this
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
