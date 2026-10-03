'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptBid, declineBid } from '@/lib/server-actions/marketplace';

export function BidActions({ bidId }: { bidId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => {
            if (confirm('Hire this trade? This will start the job and decline the other quotes.')) {
              run(() => acceptBid(bidId));
            }
          }}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          Accept &amp; hire
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => declineBid(bidId))}
          className="rounded-lg border border-hairline px-4 py-2 text-xs font-bold text-ink-muted disabled:opacity-60"
        >
          Decline
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
