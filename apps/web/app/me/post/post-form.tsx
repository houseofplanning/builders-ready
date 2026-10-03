'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TRADE_CATEGORIES } from '@br/shared';
import { createJobRequest } from '@/lib/server-actions/marketplace';

function poundsToPence(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  const n = Number(s.replace(/[£,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

export function PostJobForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      trade_category: String(fd.get('trade_category') ?? ''),
      title: String(fd.get('title') ?? ''),
      description: String(fd.get('description') ?? '') || undefined,
      city: String(fd.get('city') ?? '') || undefined,
      postcode: String(fd.get('postcode') ?? ''),
      budget_min_pence: poundsToPence(fd.get('budget_min')),
      budget_max_pence: poundsToPence(fd.get('budget_max')),
      budget_note: String(fd.get('budget_note') ?? '') || undefined,
    };
    startTransition(async () => {
      const res = await createJobRequest(payload);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.push(res.redirectTo ?? '/me');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-card border border-hairline bg-white p-6"
    >
      <Label text="What do you need?">
        <select
          name="trade_category"
          required
          defaultValue=""
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="" disabled>
            Choose a trade…
          </option>
          {TRADE_CATEGORIES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Label>

      <Label text="Job title">
        <input
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Boiler replacement"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </Label>

      <Label text="Describe the job">
        <textarea
          name="description"
          rows={4}
          maxLength={4000}
          placeholder="What needs doing, any detail, and when you'd like it done."
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </Label>

      <div className="grid grid-cols-2 gap-3">
        <Label text="Postcode">
          <input
            name="postcode"
            required
            maxLength={10}
            placeholder="SW19 8HP"
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none"
          />
        </Label>
        <Label text="Town / city (optional)">
          <input
            name="city"
            maxLength={120}
            placeholder="London"
            className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </Label>
      </div>

      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Budget (optional)
        </span>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center rounded-lg border border-hairline bg-white px-3">
            <span className="text-sm text-ink-muted">£</span>
            <input
              name="budget_min"
              inputMode="numeric"
              placeholder="Min"
              className="block w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center rounded-lg border border-hairline bg-white px-3">
            <span className="text-sm text-ink-muted">£</span>
            <input
              name="budget_max"
              inputMode="numeric"
              placeholder="Max"
              className="block w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
        <input
          name="budget_note"
          maxLength={200}
          placeholder="Or a note, e.g. “open to quotes”"
          className="mt-2 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Posting…' : 'Post job — it’s free'}
      </button>
    </form>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {text}
      </span>
      {children}
    </label>
  );
}
