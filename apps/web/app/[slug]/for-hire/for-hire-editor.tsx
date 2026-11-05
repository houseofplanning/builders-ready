'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRADE_CATEGORIES } from '@br/shared';
import { saveForHireProfile } from '@/lib/server-actions/for-hire';

interface Initial {
  discoverable: boolean;
  day_rate_pence: number | null;
  day_rate_unit: 'day' | 'hour';
  trades: string[];
  service_area: string | null;
}

const penceToPounds = (p: number | null) => (p == null ? '' : String(Math.round(p / 100)));

export function ForHireEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [discoverable, setDiscoverable] = useState(initial.discoverable);
  const [unit, setUnit] = useState<'day' | 'hour'>(initial.day_rate_unit ?? 'day');
  const [rate, setRate] = useState(penceToPounds(initial.day_rate_pence));
  const [trades, setTrades] = useState<string[]>(initial.trades);
  const [area, setArea] = useState(initial.service_area ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggleTrade(t: string) {
    setTrades((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const pounds = rate.trim() === '' ? null : Number(rate);
    const res = await saveForHireProfile({
      discoverable,
      day_rate_pence: pounds != null && Number.isFinite(pounds) ? Math.round(pounds * 100) : null,
      day_rate_unit: unit,
      trades,
      service_area: area,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? 'Could not save.');
      return;
    }
    setMsg('Saved.');
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Available for work toggle */}
      <div className="flex items-center justify-between rounded-card border border-hairline bg-white p-4 shadow-card">
        <div className="pr-4">
          <div className="font-bold">Available for work</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            When on, your profile appears in the directory and you can bid on other builders' jobs.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={discoverable}
          onClick={() => setDiscoverable((v) => !v)}
          className={`relative h-7 w-12 flex-none rounded-full transition ${discoverable ? 'bg-primary' : 'bg-hairline'}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${discoverable ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </div>

      <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Advertised rate (optional)</span>
          <div className="flex gap-2">
            <div className="flex items-center rounded-lg border border-hairline px-3">
              <span className="text-sm text-ink-muted">£</span>
              <input
                value={rate}
                onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="numeric"
                placeholder="0"
                className="w-24 px-2 py-2 text-sm focus:outline-none"
              />
            </div>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'day' | 'hour')}
              className="rounded-lg border border-hairline px-3 py-2 text-sm"
            >
              <option value="day">per day</option>
              <option value="hour">per hour</option>
            </select>
          </div>
          <span className="mt-1 block text-[11px] text-ink-muted">
            A public starting point. Whatever a builder actually agrees with you stays private between you.
          </span>
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Area you cover</span>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. North London, M25 within 20 miles"
            className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
        <div className="mb-2 text-xs font-semibold text-ink-soft">Trades you offer</div>
        <div className="flex flex-wrap gap-2">
          {TRADE_CATEGORIES.map((t) => {
            const on = trades.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTrade(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? 'border-primary bg-primary text-white' : 'border-hairline text-ink-muted hover:border-primary/40'}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">
        A complete profile with your certs and insurances showing makes builders far more likely to
        approach and hire you. Add those under Team &amp; rates.
      </p>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
