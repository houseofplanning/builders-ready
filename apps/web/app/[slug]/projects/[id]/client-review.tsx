'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitReview } from '@/lib/server-actions/marketplace';

export function ClientReviewSection({
  projectId,
  clientId,
  clientName,
  alreadyReviewed,
}: {
  projectId: string;
  clientId: string;
  clientName: string;
  alreadyReviewed: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (alreadyReviewed) {
    return (
      <section className="mt-6 rounded-card border border-hairline bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold text-ink">Review the client</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Thanks — you&rsquo;ve reviewed {clientName}.
        </p>
      </section>
    );
  }

  function submit() {
    setError(null);
    if (rating < 1) {
      setError('Pick a star rating.');
      return;
    }
    startTransition(async () => {
      const res = await submitReview({
        project_id: projectId,
        reviewee_id: clientId,
        direction: 'trade_to_customer',
        rating,
        body: body.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold text-ink">Review the client</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Only trades see this — it helps others spot good customers (and time-wasters).
      </p>

      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-2xl leading-none ${n <= rating ? 'text-accent' : 'text-hairline'}`}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={`How was working with ${clientName}? Clear brief, paid on time…`}
        className="mt-3 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="mt-3 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Submitting…' : 'Submit review'}
      </button>
    </section>
  );
}
