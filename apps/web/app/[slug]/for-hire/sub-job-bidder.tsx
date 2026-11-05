'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { placeSubBid, type SubJobPost } from '@/lib/server-actions/sub-jobs';

type OpenJob = SubJobPost & { poster_name?: string | null; my_bid_status?: string | null };

export function SubJobBidder({ initial }: { initial: OpenJob[] }) {
  const router = useRouter();
  const [jobs] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function bid(e: React.FormEvent<HTMLFormElement>, postId: string) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const pounds = String(fd.get('amount') ?? '').trim();
    const res = await placeSubBid({
      post_id: postId,
      amount_pence: pounds === '' ? null : Math.round(Number(pounds) * 100),
      message: String(fd.get('message') ?? '') || null,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not bid.');
    setOpenId(null);
    router.refresh();
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-hairline bg-white/60 p-6 text-center text-sm text-ink-muted">
        No open jobs from other builders right now. Switch on "available for work" above so you're in
        the running when they post.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <div key={j.id} className="rounded-card border border-hairline bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold">{j.title}</div>
              <div className="text-xs text-ink-muted">
                {j.poster_name}{[j.trade, j.area, j.duration_note].filter(Boolean).length ? ' · ' : ''}
                {[j.trade, j.area, j.duration_note].filter(Boolean).join(' · ')}
              </div>
            </div>
            {j.my_bid_status && (
              <span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold text-ink-muted">
                {j.my_bid_status === 'accepted' ? 'You won this' : j.my_bid_status === 'declined' ? 'Not selected' : 'Bid sent'}
              </span>
            )}
          </div>
          {j.description && <p className="mt-2 text-sm text-ink-soft">{j.description}</p>}
          {j.budget_note && <p className="mt-1 text-xs text-ink-muted">Budget: {j.budget_note}</p>}

          {!j.my_bid_status && (
            openId === j.id ? (
              <form onSubmit={(e) => bid(e, j.id)} className="mt-3 space-y-2 border-t border-hairline pt-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-hairline px-3">
                    <span className="text-sm text-ink-muted">£</span>
                    <input name="amount" inputMode="numeric" placeholder="Your price (optional)" className="w-40 px-2 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
                <textarea name="message" rows={2} placeholder="A line about you / availability" className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
                {err && <p className="text-sm text-red-600">{err}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpenId(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted">Cancel</button>
                  <button disabled={busy} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send bid'}</button>
                </div>
              </form>
            ) : (
              <div className="mt-3 text-right">
                <button onClick={() => setOpenId(j.id)} className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-canvas">Bid on this</button>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}
