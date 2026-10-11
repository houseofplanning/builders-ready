'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectStage } from '@br/shared';
import { StageRow } from './stage-row';
import { saveProjectStages } from '@/lib/server-actions/stages';

interface EditRow {
  key: string;
  id: string | null;
  name: string;
  start_date: string;
  target_end_date: string;
}

let seq = 0;
const newKey = () => `s${(seq += 1)}`;
const dateVal = (d: string | null) => (d ? String(d).slice(0, 10) : '');

export function TimelineSection({
  projectId,
  stages,
  canWrite,
}: {
  projectId: string;
  stages: ProjectStage[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);

  function startEdit() {
    setError(null);
    setRows(
      stages.map((s) => ({
        key: newKey(),
        id: s.id,
        name: s.name,
        start_date: dateVal(s.start_date),
        target_end_date: dateVal(s.target_end_date),
      })),
    );
    setEditing(true);
  }

  function patch(key: string, p: Partial<EditRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function onSave() {
    setError(null);
    const cleaned = rows.filter((r) => r.name.trim());
    if (cleaned.length === 0) {
      setError('Add at least one stage.');
      return;
    }
    for (const r of cleaned) {
      if (r.start_date && r.target_end_date && r.target_end_date < r.start_date) {
        setError(`"${r.name.trim()}" ends before it starts — check the dates.`);
        return;
      }
    }
    startTransition(async () => {
      const res = await saveProjectStages({
        project_id: projectId,
        stages: cleaned.map((r) => ({
          id: r.id,
          name: r.name.trim(),
          start_date: r.start_date || null,
          target_end_date: r.target_end_date || null,
        })),
      });
      if (!res.ok) {
        setError(res.error ?? 'Could not save the timeline.');
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  const inputCls =
    'rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none';

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex items-center px-5 py-3">
        <h2 className="text-sm font-bold">Timeline</h2>
        <span className="ml-2 text-xs text-ink-muted">{stages.length} stages</span>
        {canWrite && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="ml-auto rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
          >
            Edit timeline
          </button>
        )}
      </header>

      {!editing ? (
        <ol>
          {stages.map((s, idx) => (
            <StageRow key={s.id} stage={s} isLast={idx === stages.length - 1} canWrite={canWrite} />
          ))}
        </ol>
      ) : (
        <div className="border-t border-hairline px-5 py-4">
          <p className="mb-3 text-[11px] text-ink-muted">
            Add, remove, reorder or re-date stages to match how the job runs (e.g. line them
            up with your payment milestones). Renaming here keeps each stage&apos;s status.
          </p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div
                key={r.key}
                className="grid items-center gap-2 rounded-lg border border-hairline bg-canvas p-2 md:grid-cols-[1.6fr_1fr_1fr_auto]"
              >
                <input
                  value={r.name}
                  onChange={(e) => patch(r.key, { name: e.target.value })}
                  placeholder="Stage name"
                  className={inputCls}
                />
                <label className="flex items-center gap-1 text-[10px] text-ink-muted">
                  <span className="w-8 shrink-0">Start</span>
                  <input
                    type="date"
                    value={r.start_date}
                    onChange={(e) => patch(r.key, { start_date: e.target.value })}
                    className={`${inputCls} w-full`}
                  />
                </label>
                <label className="flex items-center gap-1 text-[10px] text-ink-muted">
                  <span className="w-8 shrink-0">End</span>
                  <input
                    type="date"
                    value={r.target_end_date}
                    onChange={(e) => patch(r.key, { target_end_date: e.target.value })}
                    className={`${inputCls} w-full`}
                  />
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded border border-hairline px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    aria-label="Move down"
                    className="rounded border border-hairline px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows((p) => (p.length > 1 ? p.filter((x) => x.key !== r.key) : p))}
                    aria-label="Remove stage"
                    className="rounded border border-hairline px-2 py-1 text-xs font-semibold text-error hover:bg-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setRows((p) => [
                ...p,
                { key: newKey(), id: null, name: '', start_date: '', target_end_date: '' },
              ])
            }
            className="mt-2 rounded-md border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-canvas"
          >
            + Add stage
          </button>

          {error && <div className="mt-3 text-xs text-error">{error}</div>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save timeline'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
