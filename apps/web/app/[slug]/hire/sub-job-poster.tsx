'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRADE_CATEGORIES } from '@br/shared';
import {
  createSubJobPost,
  acceptSubBid,
  closeSubJobPost,
  type SubJobPost,
  type SubJobBid,
} from '@/lib/server-actions/sub-jobs';

const money = (p: number | null) =>
  p == null ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);

export function SubJobPoster({ posts, bids }: { posts: SubJobPost[]; bids: SubJobBid[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const res = await createSubJobPost({
      title: String(fd.get('title') ?? ''),
      trade: String(fd.get('trade') ?? '') || null,
      description: String(fd.get('description') ?? '') || null,
      area: String(fd.get('area') ?? '') || null,
      start_date: String(fd.get('start_date') ?? '') || null,
      duration_note: String(fd.get('duration') ?? '') || null,
      budget_note: String(fd.get('budget') ?? '') || null,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not post.');
    setOpen(false);
    router.refresh();
  }

  async function accept(id: string) {
    if (!confirm('Accept this bid? They join your team as a subcontractor.')) return;
    await acceptSubBid(id);
    router.refresh();
  }
  async function close(id: string) {
    await closeSubJobPost(id);
    router.refresh();
  }

  const bidsByPost = new Map<string, SubJobBid[]>();
  for (const b of bids) {
    const arr = bidsByPost.get(b.post_id) ?? [];
    arr.push(b);
    bidsByPost.set(b.post_id, arr);
  }

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight">Your job posts</h2>
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-canvas">
          {open ? 'Cancel' : '+ Post a job'}
        </button>
      </div>

      {open && (
        <form onSubmit={create} className="mb-4 space-y-3 rounded-card border border-hairline bg-white p-4 shadow-card">
          <input name="title" required placeholder="Job title (e.g. 2nd fix plumbing, 3-bed extension)" className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <select name="trade" className="rounded-lg border border-hairline px-3 py-2 text-sm">
              <option value="">Any trade</option>
              {TRADE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input name="area" placeholder="Area" className="min-w-0 flex-1 rounded-lg border border-hairline px-3 py-2 text-sm" />
          </div>
          <textarea name="description" rows={3} placeholder="What's the work?" className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-ink-muted">Start date<input type="date" name="start_date" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
            <label className="flex-1 text-xs text-ink-muted">Duration<input name="duration" placeholder="e.g. 2 weeks" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
            <label className="flex-1 text-xs text-ink-muted">Budget note<input name="budget" placeholder="e.g. day rate" className="mt-1 w-full rounded-lg border border-hairline px-3 py-2 text-sm" /></label>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-end">
            <button disabled={busy} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Posting…' : 'Post job'}</button>
          </div>
        </form>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-ink-muted">No job posts yet. Post one to get bids from available tradespeople.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const pBids = bidsByPost.get(p.id) ?? [];
            return (
              <div key={p.id} className="rounded-card border border-hairline bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{p.title}</div>
                    <div className="text-xs text-ink-muted">{[p.trade, p.area, p.duration_note].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${p.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas text-ink-muted'}`}>{p.status}</span>
                </div>
                <div className="mt-3 border-t border-hairline pt-3">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-soft">Bids ({pBids.length})</div>
                  {pBids.length === 0 ? (
                    <p className="text-xs text-ink-muted">No bids yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {pBids.map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{b.bidder_name} · {money(b.amount_pence)}</div>
                            {b.message && <div className="truncate text-xs text-ink-muted">{b.message}</div>}
                          </div>
                          {b.status === 'accepted' ? (
                            <span className="text-xs font-bold text-emerald-700">Accepted</span>
                          ) : b.status === 'declined' ? (
                            <span className="text-xs text-ink-muted">Declined</span>
                          ) : p.status === 'open' ? (
                            <button onClick={() => accept(b.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">Accept</button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {p.status === 'open' && (
                  <div className="mt-2 text-right">
                    <button onClick={() => close(p.id)} className="text-xs font-semibold text-ink-muted hover:underline">Close post</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
