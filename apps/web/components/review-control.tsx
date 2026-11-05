'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveConnectionReview } from '@/lib/server-actions/reviews';

/**
 * A compact "leave a review" control (1-5 stars + optional note) for a
 * builder<->sub shared job. Collapses to a link until opened.
 */
export function ReviewControl({
  projectId,
  counterpartyTenantId,
  direction,
  label = 'Leave a review',
}: {
  projectId: string;
  counterpartyTenantId: string;
  direction: 'builder_to_sub' | 'sub_to_builder';
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) return setErr('Pick a star rating.');
    setBusy(true);
    setErr(null);
    const res = await leaveConnectionReview({
      project_id: projectId,
      counterparty_tenant_id: counterpartyTenantId,
      direction,
      rating,
      body: body.trim() || null,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not submit.');
    setDone(true);
    router.refresh();
  }

  if (done) return <span className="text-xs font-semibold text-emerald-700">Review submitted</span>;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-primary hover:underline">
        {label}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-hairline bg-white p-3">
      <div className="mb-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-xl leading-none ${n <= rating ? 'text-amber-500' : 'text-hairline'}`}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Optional: a line about working with them"
        className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
      />
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted">Cancel</button>
        <button onClick={submit} disabled={busy} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {busy ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </div>
  );
}
