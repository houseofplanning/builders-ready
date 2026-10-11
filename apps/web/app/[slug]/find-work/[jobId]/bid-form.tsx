'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitBid } from '@/lib/server-actions/marketplace';

export function BidForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const raw = String(fd.get('amount') ?? '').replace(/[£,]/g, '').trim();
    const amount = raw ? Math.round(Number(raw) * 100) : undefined;
    const payload = {
      job_request_id: jobId,
      amount_pence: amount && Number.isFinite(amount) && amount > 0 ? amount : undefined,
      message: String(fd.get('message') ?? '') || undefined,
      available_from: String(fd.get('available_from') ?? '') || undefined,
      duration_estimate: String(fd.get('duration_estimate') ?? '') || undefined,
      warranty: String(fd.get('warranty') ?? '') || undefined,
      about: String(fd.get('about') ?? '') || undefined,
    };
    startTransition(async () => {
      const res = await submitBid(payload);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card border border-hairline bg-white p-5">
      <div className="text-sm font-extrabold text-ink">Submit your bid</div>
      <p className="mt-1 text-xs text-ink-muted">
        Give a ballpark price and a short message. Included in your subscription — no per-lead fee.
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Your price (optional)
        </span>
        <div className="flex items-center rounded-lg border border-hairline bg-white px-3">
          <span className="text-sm text-ink-muted">£</span>
          <input
            name="amount"
            inputMode="numeric"
            placeholder="e.g. 2500"
            className="block w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
          />
        </div>
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Message
        </span>
        <textarea
          name="message"
          rows={3}
          maxLength={2000}
          placeholder="Introduce yourself and how you'd approach the job."
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BidField name="available_from" label="When can you start?" placeholder="e.g. Next week" />
        <BidField name="duration_estimate" label="Estimated duration" placeholder="e.g. 2–3 days" />
        <BidField name="warranty" label="Guarantee offered" placeholder="e.g. 12-month workmanship" />
        <BidField name="about" label="About you" placeholder="e.g. Gas Safe, 15 yrs, local" />
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Submit bid'}
      </button>
    </form>
  );
}

function BidField({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <input
        name={name}
        maxLength={200}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}
