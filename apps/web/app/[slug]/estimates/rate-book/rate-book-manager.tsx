'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gbp } from '@br/shared';
import { saveTenantRateBook } from '@/lib/server-actions/rate-book';

export interface RbMaterial {
  code: string;
  name: string;
  trade_category: string;
  unit: string;
  default_pence: number;
  override_pence: number | null;
}
export interface RbLabour {
  trade: string;
  unit: string;
  default_pence: number;
  override_pence: number | null;
}

const penceToPounds = (p: number | null): string => (p == null ? '' : (p / 100).toString());
const poundsToPence = (s: string): number | null => {
  const t = s.replace(/[£,\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const tradeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ');

export function RateBookManager({
  initialMaterials,
  initialLabour,
}: {
  initialMaterials: RbMaterial[];
  initialLabour: RbLabour[];
}) {
  const router = useRouter();
  const [mat, setMat] = useState<Record<string, string>>(
    Object.fromEntries(initialMaterials.map((m) => [m.code, penceToPounds(m.override_pence)])),
  );
  const [lab, setLab] = useState<Record<string, string>>(
    Object.fromEntries(
      initialLabour.map((l) => [`${l.trade}|${l.unit}`, penceToPounds(l.override_pence)]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const groups = useMemo(() => {
    const g: Record<string, RbMaterial[]> = {};
    for (const m of initialMaterials) (g[m.trade_category] ??= []).push(m);
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [initialMaterials]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    const res = await saveTenantRateBook({
      materials: initialMaterials.map((m) => ({
        code: m.code,
        unit_cost_pence: poundsToPence(mat[m.code] ?? ''),
      })),
      labour: initialLabour.map((l) => ({
        trade: l.trade,
        unit: l.unit,
        rate_pence: poundsToPence(lab[`${l.trade}|${l.unit}`] ?? ''),
      })),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error ?? 'Could not save.');
      return;
    }
    setMsg('Saved — your prices will be used in template quotes.');
    router.refresh();
  }

  const inputCls =
    'w-28 rounded-lg border border-hairline bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-primary';

  return (
    <div className="space-y-6 pb-24">
      {/* Labour */}
      <section className="overflow-hidden rounded-card border border-hairline bg-white shadow-card">
        <div className="border-b border-hairline px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          Labour day rates
        </div>
        {initialLabour.map((l, i) => {
          const key = `${l.trade}|${l.unit}`;
          return (
            <div
              key={key}
              className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-hairline' : ''}`}
            >
              <div className="flex-1">
                <div className="text-sm font-bold text-ink">
                  {tradeLabel(l.trade)} <span className="text-ink-muted">/ {l.unit}</span>
                </div>
                <div className="text-[11px] text-ink-muted">Our suggestion {gbp(l.default_pence)}</div>
              </div>
              <div className="flex items-center gap-1 text-sm text-ink-muted">
                £
                <input
                  className={inputCls}
                  inputMode="decimal"
                  placeholder={(l.default_pence / 100).toString()}
                  value={lab[key] ?? ''}
                  onChange={(e) => setLab((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Materials by trade */}
      {groups.map(([trade, items]) => (
        <section
          key={trade}
          className="overflow-hidden rounded-card border border-hairline bg-white shadow-card"
        >
          <div className="border-b border-hairline px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            {trade}
          </div>
          {items.map((m, i) => (
            <div
              key={m.code}
              className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-hairline' : ''}`}
            >
              <div className="flex-1">
                <div className="text-sm font-bold text-ink">{m.name}</div>
                <div className="text-[11px] text-ink-muted">
                  Our suggestion {gbp(m.default_pence)}/{m.unit}
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-ink-muted">
                £
                <input
                  className={inputCls}
                  inputMode="decimal"
                  placeholder={(m.default_pence / 100).toString()}
                  value={mat[m.code] ?? ''}
                  onChange={(e) => setMat((p) => ({ ...p, [m.code]: e.target.value }))}
                />
                <span className="w-10 text-[11px]">/{m.unit}</span>
              </div>
            </div>
          ))}
        </section>
      ))}

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-hairline bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          {msg && <span className="text-xs text-ink-muted">{msg}</span>}
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save my prices'}
          </button>
        </div>
      </div>
    </div>
  );
}
