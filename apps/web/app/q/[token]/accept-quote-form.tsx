'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptEstimateByToken } from '@/lib/server-actions/estimates';

export function AcceptQuoteForm({
  token,
  primary,
  builderName,
}: {
  token: string;
  primary: string;
  builderName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setError(null);
    if (name.trim().length < 2) {
      setError('Please type your full name to accept.');
      return;
    }
    setBusy(true);
    const res = await acceptEstimateByToken(token, name.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not accept. Please try again.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-2xl border border-hairline bg-white p-6 shadow-card">
      <h2 className="text-base font-extrabold text-ink">Accept this quote</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Happy to go ahead? Type your full name to accept — {builderName} will be
        notified straight away.
      </p>
      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        Your full name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Jane Smith"
        className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
      {error && <p className="mt-2 text-xs text-[#B23B1D]">{error}</p>}
      <button
        type="button"
        onClick={onAccept}
        disabled={busy}
        className="mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: primary }}
      >
        {busy ? 'Accepting…' : 'Accept quote'}
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-muted">
        By accepting, you confirm you&apos;re happy with the scope and price
        above. This records your name and the date as your acceptance.
      </p>
    </div>
  );
}
