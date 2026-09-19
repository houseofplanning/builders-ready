'use client';

import { useState, useTransition } from 'react';
import {
  gbp,
  formatDate,
  COST_CATEGORY_LABELS,
  COST_CATEGORIES,
} from '@br/shared';
import type { CostCategory } from '@br/shared';
import {
  createCostOnWeb,
  deleteCostOnWeb,
  getCostReceiptUrl,
} from '@/lib/server-actions/costs';

export interface CostRow {
  id: string;
  category: CostCategory;
  description: string;
  supplier: string | null;
  incurred_on: string;
  amount_pence: number;
  has_receipt: boolean;
}

export interface MarginData {
  contract_value_pence: number;
  cost_to_date_pence: number;
  margin_pence: number;
  margin_percent: number;
  budgeted_cost_pence: number | null;
  cost_variance_pence: number | null;
  by_category: Record<CostCategory, number>;
}

export function CostsSection({
  projectId,
  costs,
  margin,
  canWrite,
}: {
  projectId: string;
  costs: CostRow[];
  margin: MarginData;
  canWrite: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const marginPositive = margin.margin_pence >= 0;
  const overBudget = (margin.cost_variance_pence ?? 0) > 0;

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex flex-wrap items-center gap-2 px-5 py-3">
        <h2 className="text-sm font-bold">Costs &amp; margin</h2>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
          Your team only
        </span>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? 'Cancel' : '+ Log cost'}
          </button>
        )}
      </header>

      {/* MARGIN PANEL */}
      <div className="grid gap-4 border-t border-hairline px-5 py-5 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg border border-hairline bg-canvas p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Margin so far
          </div>
          <div
            className={`mt-1 text-3xl font-extrabold tracking-tight ${
              marginPositive ? 'text-[#0F6E56]' : 'text-error'
            }`}
          >
            {gbp(margin.margin_pence)}
          </div>
          <div className="text-xs text-ink-muted">
            {Math.round(margin.margin_percent)}% of contract value
          </div>
          <div className="mt-3 space-y-1">
            <Line label="Contract value" value={gbp(margin.contract_value_pence)} />
            <Line label="Cost to date" value={gbp(margin.cost_to_date_pence)} />
            {margin.budgeted_cost_pence != null && (
              <>
                <Line
                  label="Budgeted cost (quote)"
                  value={gbp(margin.budgeted_cost_pence)}
                />
                <Line
                  label={overBudget ? 'Over budget by' : 'Under budget by'}
                  value={gbp(Math.abs(margin.cost_variance_pence ?? 0))}
                  valueClass={overBudget ? 'text-error' : 'text-[#0F6E56]'}
                />
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-hairline p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Costs by category
          </div>
          {margin.cost_to_date_pence === 0 ? (
            <p className="mt-2 text-xs text-ink-muted">No costs logged yet.</p>
          ) : (
            <div className="mt-2 space-y-1">
              {COST_CATEGORIES.filter((k) => margin.by_category[k] > 0).map((k) => (
                <Line
                  key={k}
                  label={COST_CATEGORY_LABELS[k]}
                  value={gbp(margin.by_category[k])}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="border-t border-hairline px-5 py-4">
          <NewCostForm projectId={projectId} onDone={() => setShowForm(false)} />
        </div>
      )}

      {/* COSTS LIST */}
      <ul className="border-t border-hairline">
        {costs.length === 0 ? (
          <li className="px-5 py-8 text-center text-xs text-ink-muted">
            No costs logged yet.
          </li>
        ) : (
          costs.map((c) => <CostRowComponent key={c.id} cost={c} canWrite={canWrite} />)
        )}
      </ul>
    </section>
  );
}

function CostRowComponent({
  cost,
  canWrite,
}: {
  cost: CostRow;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm('Delete this cost?')) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCostOnWeb(cost.id);
      if (!res.ok) setError(res.error ?? 'Failed.');
    });
  }

  async function onView() {
    const res = await getCostReceiptUrl(cost.id);
    if (res.ok && res.url) window.open(res.url, '_blank');
    else setError(res.error ?? 'No receipt.');
  }

  return (
    <li className="border-b border-hairline px-5 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-bold">{cost.description}</div>
          <div className="mt-0.5 text-[11px] text-ink-muted">
            {COST_CATEGORY_LABELS[cost.category]}
            {cost.supplier ? ` · ${cost.supplier}` : ''} ·{' '}
            {formatDate(cost.incurred_on, { short: true })}
            {cost.has_receipt && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={onView}
                  className="font-semibold text-primary hover:underline"
                >
                  view receipt
                </button>
              </>
            )}
          </div>
        </div>
        <div className="text-sm font-extrabold">{gbp(cost.amount_pence)}</div>
        {canWrite && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-[11px] font-semibold text-error hover:underline disabled:opacity-50"
          >
            {pending ? '…' : 'Delete'}
          </button>
        )}
      </div>
      {error && <div className="mt-1 text-[11px] text-error">{error}</div>}
    </li>
  );
}

function NewCostForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const amountText = String(fd.get('amount') ?? '').trim();
    const amount_pence = amountText
      ? Math.round(parseFloat(amountText.replace(/[£,\s]/g, '')) * 100)
      : 0;
    const description = String(fd.get('description') ?? '').trim();
    if (amount_pence <= 0) {
      setError('Amount must be positive.');
      return;
    }
    if (!description) {
      setError('Add a description.');
      return;
    }
    startTransition(async () => {
      const res = await createCostOnWeb({
        project_id: projectId,
        category: String(fd.get('category') ?? 'materials'),
        description,
        amount_pence,
        supplier: String(fd.get('supplier') ?? '').trim() || null,
        incurred_on: String(fd.get('incurred_on') ?? today),
        receipt_storage_path: null,
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      onDone();
    });
  }

  const inputCls =
    'block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none';
  const lbl =
    'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted';

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        <label className="block">
          <span className={lbl}>£ amount</span>
          <input name="amount" placeholder="e.g. 1240" className={inputCls} required />
        </label>
        <label className="block">
          <span className={lbl}>Category</span>
          <select name="category" defaultValue="materials" className={inputCls}>
            {COST_CATEGORIES.map((k) => (
              <option key={k} value={k}>
                {COST_CATEGORY_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Date</span>
          <input
            name="incurred_on"
            type="date"
            defaultValue={today}
            className={inputCls}
            required
          />
        </label>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block">
          <span className={lbl}>Description</span>
          <input
            name="description"
            placeholder="e.g. Plasterboard & fixings"
            className={inputCls}
            required
          />
        </label>
        <label className="block">
          <span className={lbl}>Supplier (optional)</span>
          <input name="supplier" placeholder="e.g. Travis Perkins" className={inputCls} />
        </label>
      </div>
      <p className="text-[11px] text-ink-muted">
        Tip: snap receipt photos from the mobile app on site — they show up here.
      </p>
      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Log cost'}
        </button>
      </div>
    </form>
  );
}

function Line({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className={`font-bold ${valueClass ?? 'text-ink'}`}>{value}</span>
    </div>
  );
}
