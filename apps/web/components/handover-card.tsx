'use client';

import { useState, useTransition } from 'react';
import {
  generateHandoverPdf,
  getHandoverDownloadUrl,
} from '@/lib/server-actions/handover';

export function HandoverCard({
  projectId,
  hasPdf,
  canGenerate,
}: {
  projectId: string;
  hasPdf: boolean;
  canGenerate: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(hasPdf);

  function onGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateHandoverPdf(projectId);
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      setGenerated(true);
    });
  }

  function onDownload() {
    setError(null);
    startTransition(async () => {
      const res = await getHandoverDownloadUrl(projectId);
      if (!res.ok || !res.url) {
        setError(res.error ?? 'No URL.');
        return;
      }
      window.open(res.url, '_blank', 'noopener');
    });
  }

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white p-5 shadow-card">
      <div className="flex items-center">
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-muted">
            Handover document
          </div>
          <div className="mt-1 text-sm text-ink">
            One PDF the client keeps for life: quote vs. final, variations log,
            timeline, every update, decisions, invoices.
          </div>
        </div>
        <div className="flex gap-2">
          {generated && (
            <button
              type="button"
              onClick={onDownload}
              disabled={pending}
              className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-60"
            >
              Download
            </button>
          )}
          {canGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending
                ? 'Generating…'
                : generated
                  ? 'Regenerate'
                  : 'Generate PDF'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-3 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
    </section>
  );
}
