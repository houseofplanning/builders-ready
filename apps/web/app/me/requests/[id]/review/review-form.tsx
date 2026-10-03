'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitReview } from '@/lib/server-actions/marketplace';

export function ReviewForm({
  projectId,
  revieweeId,
  backTo,
}: {
  projectId: string;
  revieweeId: string;
  backTo: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError('Pick a star rating.');
      return;
    }
    startTransition(async () => {
      const res = await submitReview({
        project_id: projectId,
        reviewee_id: revieweeId,
        direction: 'customer_to_trade',
        rating,
        body: body.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.push(backTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-card border border-hairline bg-white p-6">
      <div className="text-sm font-extrabold text-ink">How was the trade?</div>
      <p className="mt-1 text-xs text-ink-muted">Your review helps other homeowners.</p>

      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-3xl leading-none ${n <= rating ? 'text-accent' : 'text-hairline'}`}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Tell others how it went — quality, timekeeping, tidiness…"
        className="mt-4 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
