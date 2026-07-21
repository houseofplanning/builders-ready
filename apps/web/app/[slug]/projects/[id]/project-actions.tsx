'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveProject, deleteProject } from '@/lib/server-actions/projects';

export function ProjectActions({
  projectId,
  slug,
  projectName,
  isOwner,
  canArchive,
}: {
  projectId: string;
  slug: string;
  projectName: string;
  isOwner: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onArchive() {
    if (
      !confirm(
        `Archive “${projectName}”? It will be hidden from your dashboard and stop counting toward your plan limit. Its data is kept and you can still find it later.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      await archiveProject(projectId);
      router.push(`/${slug}/projects`);
    });
  }

  function onDelete() {
    if (
      !confirm(
        `Permanently delete “${projectName}”?\n\nThis removes the project and ALL of its decisions, variations, invoices, updates and documents. This cannot be undone.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteProject(projectId);
      if (!res.ok) {
        setError(res.error ?? 'Could not delete the project.');
        return;
      }
      router.push(`/${slug}/projects`);
    });
  }

  return (
    <section className="mt-8 rounded-card border border-error/30 bg-error/5 p-5">
      <h2 className="text-sm font-bold text-error">Danger zone</h2>
      <p className="mt-1 max-w-2xl text-xs text-ink-muted">
        <strong>Archive</strong> hides a finished or mistaken project and frees a plan slot —
        its data is kept. <strong>Delete</strong> removes the project and everything in it
        permanently. Use delete for projects created in error (e.g. a wrong quote).
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {canArchive && (
          <button
            type="button"
            onClick={onArchive}
            disabled={pending}
            className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-60"
          >
            {pending ? 'Working…' : 'Archive project'}
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Working…' : 'Delete permanently'}
          </button>
        )}
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-error bg-white px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
    </section>
  );
}
