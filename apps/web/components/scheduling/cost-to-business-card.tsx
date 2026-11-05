'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type CostCategory, COST_CATEGORY_LABELS } from '@br/shared';
import { createCostOnWeb } from '@/lib/server-actions/costs';

export interface BreakdownBar {
  label: string;
  value: number;
  colour: string;
}

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);
const poundsToPence = (s: string): number | null => {
  const t = s.replace(/[£,\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

// Categories offered for manual logging here (labour & subbie usually come
// from the schedule, but a one-off is allowed).
const LOGGABLE: CostCategory[] = ['materials', 'plant_hire', 'subcontractor', 'labour', 'other'];

export function CostToBusinessCard({
  projectId,
  breakdown,
  costToDate,
  scheduledTotal,
  canWrite,
}: {
  projectId: string;
  breakdown: BreakdownBar[];
  costToDate: number;
  scheduledTotal: number;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const maxBar = Math.max(costToDate, 1);

  return (
    <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">Cost to business</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold">{money(costToDate)}</span>
          {canWrite && (
            <button onClick={() => setAdding((v) => !v)} className="rounded-lg border border-primary px-2.5 py-1 text-xs font-bold text-primary hover:bg-canvas">
              {adding ? 'Close' : '+ Log cost'}
            </button>
          )}
        </div>
      </div>

      {canWrite && adding && <LogCostForm projectId={projectId} onDone={() => { setAdding(false); router.refresh(); }} />}

      {breakdown.length === 0 ? (
        <p className="text-sm text-ink-muted">No costs yet. Log materials or plant above, or assign the team.</p>
      ) : (
        <div className="space-y-3">
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{b.label}</span>
                <span className="font-bold">{money(b.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full" style={{ width: `${(b.value / maxBar) * 100}%`, background: b.colour }} />
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t border-hairline pt-3 text-sm font-extrabold">
            <span>Total</span>
            <span>{money(costToDate)}</span>
          </div>
          {scheduledTotal > 0 && (
            <p className="text-[11px] text-ink-muted">
              Includes {money(scheduledTotal)} scheduled labour &amp; subbies from the schedule.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function LogCostForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [category, setCategory] = useState<CostCategory>('materials');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [supplier, setSupplier] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const pence = poundsToPence(amount);
    if (!description.trim()) return setErr('Add a short description.');
    if (pence == null) return setErr('Enter a valid amount.');
    setBusy(true);
    setErr(null);
    const res = await createCostOnWeb({
      project_id: projectId,
      category,
      description: description.trim(),
      amount_pence: pence,
      supplier: supplier.trim() || null,
      incurred_on: new Date().toISOString().slice(0, 10),
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not log cost.');
    onDone();
  }

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-hairline bg-canvas/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CostCategory)} className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm">
            {LOGGABLE.map((c) => (
              <option key={c} value={c}>
                {COST_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Amount (£)</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1250" className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Blocks & sand delivery" className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Supplier (optional)</span>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Travis Perkins" className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm" />
        </label>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="text-xs font-semibold text-ink-muted">Cancel</button>
        <button onClick={submit} disabled={busy} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {busy ? 'Saving…' : 'Log cost'}
        </button>
      </div>
    </div>
  );
}
