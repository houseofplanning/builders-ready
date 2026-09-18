'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gbp, ESTIMATE_LINE_KIND_LABELS } from '@br/shared';
import type { EstimateLineKind, SavedRate } from '@br/shared';
import {
  createSavedRateOnWeb,
  updateSavedRateOnWeb,
  deleteSavedRateOnWeb,
} from '@/lib/server-actions/saved-rates';

const KINDS: EstimateLineKind[] = [
  'material',
  'labour_day_rate',
  'labour_hourly',
  'fixed',
  'other',
];

function poundsToPence(s: string): number {
  const n = Number(s.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}
function num(s: string): number {
  const n = Number(s.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function RatesManager({
  slug,
  rates,
}: {
  slug: string;
  rates: SavedRate[];
}) {
  void slug;
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<EstimateLineKind>('material');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('each');
  const [costText, setCostText] = useState('');
  const [markupText, setMarkupText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditingId(null);
    setKind('material');
    setDescription('');
    setUnit('each');
    setCostText('');
    setMarkupText('');
    setError(null);
  }

  function startEdit(r: SavedRate) {
    setEditingId(r.id);
    setKind(r.kind);
    setDescription(r.description);
    setUnit(r.unit);
    setCostText((r.default_unit_cost_pence / 100).toString());
    setMarkupText(r.default_markup_percent ? String(r.default_markup_percent) : '');
    setError(null);
  }

  async function onSave() {
    setError(null);
    if (description.trim().length < 1) {
      setError('Give the rate a description.');
      return;
    }
    setBusy(true);
    const payload = {
      kind,
      description: description.trim(),
      unit: unit.trim() || 'each',
      default_unit_cost_pence: poundsToPence(costText),
      default_markup_percent: num(markupText),
    };
    const res = editingId
      ? await updateSavedRateOnWeb(editingId, payload)
      : await createSavedRateOnWeb(payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    reset();
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm('Delete this rate? Existing quotes keep their values.')) {
      return;
    }
    const res = await deleteSavedRateOnWeb(id);
    if (!res.ok) {
      window.alert(res.error ?? 'Could not delete.');
      return;
    }
    if (editingId === id) reset();
    router.refresh();
  }

  const inputCls =
    'w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary';
  const lbl =
    'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* FORM */}
      <div className="rounded-card border border-hairline bg-white p-5 shadow-card lg:sticky lg:top-6 lg:self-start">
        <h2 className="text-sm font-extrabold">
          {editingId ? 'Edit rate' : 'Add a rate'}
        </h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className={lbl}>Type</label>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    kind === k
                      ? 'border-primary bg-primary text-white'
                      : 'border-hairline bg-white text-ink'
                  }`}
                >
                  {ESTIMATE_LINE_KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <input
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Labourer, Plasterboard 12.5mm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={lbl}>Unit</label>
              <input
                className={inputCls}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Cost £</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={costText}
                onChange={(e) =>
                  setCostText(e.target.value.replace(/[^0-9.]/g, ''))
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={lbl}>Markup %</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={markupText}
                onChange={(e) =>
                  setMarkupText(e.target.value.replace(/[^0-9.]/g, ''))
                }
                placeholder="0"
              />
            </div>
          </div>
          {error && <p className="text-xs text-[#B23B1D]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add rate'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      <div>
        {rates.length === 0 ? (
          <div className="rounded-card border border-dashed border-hairline bg-white p-10 text-center text-sm text-ink-muted">
            No saved rates yet. Add your common materials and labour rates here —
            they&apos;ll appear as one-tap chips when you build a quote.
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-hairline bg-white shadow-card">
            {rates.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center gap-4 p-4 ${
                  i > 0 ? 'border-t border-hairline' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">
                    {r.description}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">
                    {ESTIMATE_LINE_KIND_LABELS[r.kind]} ·{' '}
                    {gbp(r.default_unit_cost_pence)}/{r.unit}
                    {r.default_markup_percent > 0
                      ? ` · +${r.default_markup_percent}%`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  className="text-xs font-semibold text-[#B23B1D] hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
