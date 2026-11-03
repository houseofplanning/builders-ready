'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export function PlanningLetter({
  listingId,
  initialBody,
}: {
  listingId: string;
  initialBody: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Please sign in again.');
      const res = await fetch('/api/planning/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listing_id: listingId, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Could not send the letter.');
      setDone(json.to ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-white py-3 text-sm font-semibold text-ink hover:border-primary"
      >
        Draft a letter to post
      </button>
    );
  }

  if (done !== null) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Letter emailed{done ? ` to ${done}` : ''}. Print it and post it through the door.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-white p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Letter to the occupier</div>
      <p className="mb-3 text-xs text-ink-muted">
        Addressed to the occupier using the public planning record — no personal details. Edit anything, then send it to
        your own email to print and post.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={14}
        className="w-full rounded-lg border border-hairline p-3 text-sm focus:border-primary focus:outline-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Email it to me to print'}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm font-semibold text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
