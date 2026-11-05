'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TRADE_CATEGORIES } from '@br/shared';
import {
  searchTradespeople,
  hireFromDirectory,
  type DirectoryTradesperson,
} from '@/lib/server-actions/connections';

const money = (p: number | null, unit: string | null) => {
  if (p == null) return 'Rate on request';
  const amt = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(p / 100);
  return `${amt}/${unit === 'hour' ? 'hr' : 'day'}`;
};
const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

export function HireDirectory({
  initialRows,
  initialHiredIds,
}: {
  initialRows: DirectoryTradesperson[];
  initialHiredIds: string[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [hired, setHired] = useState<string[]>(initialHiredIds);
  const [trade, setTrade] = useState('');
  const [area, setArea] = useState('');
  const [searching, startSearch] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function runSearch() {
    startSearch(async () => {
      setErr(null);
      const res = await searchTradespeople(trade || null, area || null);
      if (!res.ok) return setErr(res.error ?? 'Search failed.');
      setRows(res.rows ?? []);
    });
  }

  async function hire(t: DirectoryTradesperson) {
    setBusyId(t.tenant_id);
    setErr(null);
    const res = await hireFromDirectory({
      marketplace_tenant_id: t.tenant_id,
      display_name: t.name,
      trade: t.trades[0] ?? null,
      day_rate_pence: t.day_rate_pence,
      day_rate_unit: t.day_rate_unit,
    });
    setBusyId(null);
    if (!res.ok) return setErr(res.error ?? 'Could not add.');
    setHired((prev) => [...prev, t.tenant_id]);
    router.refresh();
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
        >
          <option value="">All trades</option>
          {TRADE_CATEGORIES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Area (e.g. North London)"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={runSearch}
          disabled={searching}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-white/60 p-8 text-center text-sm text-ink-muted">
          No tradespeople available for work match that yet. Try a wider area or all trades.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => {
            const isHired = hired.includes(t.tenant_id);
            return (
              <div key={t.tenant_id} className="flex flex-col rounded-card border border-hairline bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {t.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(t.name) || '?'
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-bold">{t.name}</div>
                    <div className="text-xs text-ink-muted">
                      {t.rating != null ? `★ ${t.rating} (${t.review_count})` : 'No reviews yet'}
                    </div>
                  </div>
                </div>

                {t.trades.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.trades.slice(0, 3).map((tr) => (
                      <span key={tr} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{tr}</span>
                    ))}
                    {t.trades.length > 3 && (
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-ink-muted">+{t.trades.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-bold text-ink">{money(t.day_rate_pence, t.day_rate_unit)}</span>
                  {t.service_area && <span className="truncate pl-2 text-xs text-ink-muted">{t.service_area}</span>}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {isHired ? (
                    <span className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-700">
                      On your team
                    </span>
                  ) : (
                    <button
                      onClick={() => hire(t)}
                      disabled={busyId === t.tenant_id}
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {busyId === t.tenant_id ? 'Adding…' : 'Add to my team'}
                    </button>
                  )}
                  {t.business_phone && (
                    <a
                      href={`tel:${t.business_phone}`}
                      className="rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-primary hover:bg-canvas"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
