'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectStage } from '@br/shared';
import { postProjectUpdate } from '@/lib/server-actions/updates';

interface Props {
  projectId: string;
  stages: ProjectStage[];
}

type StageStatusChoice = 'keep' | 'in_progress' | 'complete' | 'delayed';

export function UpdateComposer({ projectId, stages }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Default to the current in-progress stage, else the first not-started, else 1st.
  const defaultStageId =
    stages.find((s) => s.status === 'in_progress')?.id ??
    stages.find((s) => s.status === 'not_started')?.id ??
    stages[0]?.id ??
    '';

  function reset() {
    setOpen(false);
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      project_id: projectId,
      stage_id: String(fd.get('stage_id') ?? ''),
      headline: String(fd.get('headline') ?? '').trim() || null,
      body: String(fd.get('body') ?? '').trim(),
      decision_needed: String(fd.get('decision_needed') ?? '').trim() || null,
      stage_status: (String(fd.get('stage_status') ?? 'keep') ||
        'keep') as StageStatusChoice,
    };
    if (!payload.body) {
      setError('Add some text to the update.');
      return;
    }
    startTransition(async () => {
      const res = await postProjectUpdate(payload);
      if (!res.ok) {
        setError(res.error ?? 'Failed to post.');
        return;
      }
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center rounded-lg border border-dashed border-hairline bg-canvas px-4 py-3 text-left text-sm text-ink-muted transition hover:border-primary hover:bg-white"
      >
        <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          +
        </span>
        Post an update — site photo coverage, progress, or a decision you need from the client
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Stage
          </span>
          <select
            name="stage_id"
            defaultValue={defaultStageId}
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.position}. {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Change stage status?
          </span>
          <select
            name="stage_status"
            defaultValue="keep"
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="keep">Keep current status</option>
            <option value="in_progress">Mark as In progress</option>
            <option value="complete">Mark as Complete</option>
            <option value="delayed">Flag as Delayed</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Headline (optional)
        </span>
        <input
          name="headline"
          placeholder="e.g. Plasterboard up on first floor"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          What happened today?
        </span>
        <textarea
          name="body"
          required
          rows={4}
          placeholder="Walk the client through site progress. Decorators arrive Monday; first-fix electrics signed off this afternoon."
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Decision needed from client (optional)
        </span>
        <input
          name="decision_needed"
          placeholder="e.g. Which worktop should we order for the kitchen?"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-ink-muted">
          Photos arrive next session — text-only for now.
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-hairline bg-white px-4 py-2 text-xs font-semibold text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Posting…' : 'Post update'}
          </button>
        </div>
      </div>
    </form>
  );
}
