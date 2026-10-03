'use client';

import { useMemo, useState } from 'react';
import { TemplatePicker } from '@/components/template-picker';
import { useRouter } from 'next/navigation';
import {
  gbp,
  computeEstimateTotals,
  linePricePence,
  marginPercent,
  ESTIMATE_LINE_KIND_LABELS,
  ESTIMATE_LINE_KIND_DEFAULT_UNIT,
  VAT_MODE_LABELS,
} from '@br/shared';
import type { EstimateLineKind, SavedRate, VatMode } from '@br/shared';
import {
  createEstimateOnWeb,
  updateEstimateOnWeb,
} from '@/lib/server-actions/estimates';

const KINDS: EstimateLineKind[] = [
  'material',
  'labour_day_rate',
  'labour_hourly',
  'fixed',
  'other',
];
const VAT_MODES: VatMode[] = ['none', 'standard', 'reverse_charge'];

interface LineRow {
  key: string;
  kind: EstimateLineKind;
  saved_rate_id: string | null;
  description: string;
  quantityText: string;
  unit: string;
  unitCostText: string;
  markupText: string;
}

export interface EstimateFormInitial {
  id: string;
  title: string;
  project_type: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  site_address_line1: string | null;
  city: string | null;
  postcode: string | null;
  vat_mode: VatMode;
  valid_until: string | null;
  notes: string | null;
  lines: {
    kind: EstimateLineKind;
    saved_rate_id: string | null;
    description: string;
    quantity: number;
    unit: string;
    unit_cost_pence: number;
    markup_percent: number;
  }[];
}

let keySeq = 0;
const newKey = () => `l${(keySeq += 1)}`;

function poundsToPence(s: string): number {
  const n = Number(s.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}
function num(s: string, fallback = 0): number {
  const n = Number(s.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}
function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function blankRow(kind: EstimateLineKind = 'material'): LineRow {
  return {
    key: newKey(),
    kind,
    saved_rate_id: null,
    description: '',
    quantityText: '1',
    unit: ESTIMATE_LINE_KIND_DEFAULT_UNIT[kind],
    unitCostText: '',
    markupText: '',
  };
}

export function EstimateForm({
  slug,
  savedRates,
  initial,
}: {
  slug: string;
  savedRates: SavedRate[];
  initial?: EstimateFormInitial;
}) {
  const router = useRouter();
  const editing = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [projectType, setProjectType] = useState(
    initial?.project_type ?? 'full_renovation',
  );
  const [clientName, setClientName] = useState(initial?.client_name ?? '');
  const [clientEmail, setClientEmail] = useState(initial?.client_email ?? '');
  const [clientPhone, setClientPhone] = useState(initial?.client_phone ?? '');
  const [addr1, setAddr1] = useState(initial?.site_address_line1 ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postcode, setPostcode] = useState(initial?.postcode ?? '');
  const [vatMode, setVatMode] = useState<VatMode>(initial?.vat_mode ?? 'none');
  const [validityDays, setValidityDays] = useState<number | null>(14);
  // When editing, keep the stored valid_until unless the user picks a preset.
  const [validityTouched, setValidityTouched] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [rows, setRows] = useState<LineRow[]>(
    initial
      ? initial.lines.map((l) => ({
          key: newKey(),
          kind: l.kind,
          saved_rate_id: l.saved_rate_id,
          description: l.description,
          quantityText: String(l.quantity),
          unit: l.unit,
          unitCostText: (l.unit_cost_pence / 100).toString(),
          markupText: l.markup_percent ? String(l.markup_percent) : '',
        }))
      : [blankRow()],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      computeEstimateTotals(
        rows.map((r) => ({
          quantity: num(r.quantityText, 0),
          unit_cost_pence: poundsToPence(r.unitCostText),
          markup_percent: num(r.markupText, 0),
        })),
        vatMode,
        2000,
      ),
    [rows, vatMode],
  );

  function patch(key: string, p: Partial<LineRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function setKind(key: string, kind: EstimateLineKind) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const unitWasDefault =
          r.unit === ESTIMATE_LINE_KIND_DEFAULT_UNIT[r.kind] || r.unit === '';
        return {
          ...r,
          kind,
          unit: unitWasDefault ? ESTIMATE_LINE_KIND_DEFAULT_UNIT[kind] : r.unit,
        };
      }),
    );
  }
  function addFromRate(rate: SavedRate) {
    setRows((prev) => [
      ...prev,
      {
        key: newKey(),
        kind: rate.kind,
        saved_rate_id: rate.id,
        description: rate.description,
        quantityText: '1',
        unit: rate.unit,
        unitCostText: (rate.default_unit_cost_pence / 100).toString(),
        markupText: rate.default_markup_percent
          ? String(rate.default_markup_percent)
          : '',
      },
    ]);
  }
  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  const meaningful = rows.filter(
    (r) => r.description.trim() || poundsToPence(r.unitCostText) > 0,
  );
  const canSave = !!clientName.trim() && !!title.trim() && meaningful.length > 0;

  async function onSubmit() {
    setError(null);
    if (!canSave) {
      setError('Add a job title, a client name, and at least one line.');
      return;
    }
    setSubmitting(true);
    const payload = {
      title: title.trim(),
      project_type: projectType,
      client_name: clientName.trim(),
      client_email: clientEmail.trim() || null,
      client_phone: clientPhone.trim() || null,
      site_address_line1: addr1.trim() || null,
      site_address_line2: null,
      city: city.trim() || null,
      postcode: postcode.trim() || null,
      vat_mode: vatMode,
      vat_rate_bp: 2000,
      valid_until:
        editing && !validityTouched
          ? initial!.valid_until ?? null
          : validityDays
            ? daysFromNowISO(validityDays)
            : null,
      notes: notes.trim() || null,
      terms: null,
      lines: meaningful.map((r) => ({
        kind: r.kind,
        saved_rate_id: r.saved_rate_id,
        description: r.description.trim() || ESTIMATE_LINE_KIND_LABELS[r.kind],
        quantity: num(r.quantityText, 1),
        unit: r.unit.trim() || ESTIMATE_LINE_KIND_DEFAULT_UNIT[r.kind],
        unit_cost_pence: poundsToPence(r.unitCostText),
        markup_percent: num(r.markupText, 0),
      })),
    };
    const res = editing
      ? await updateEstimateOnWeb(initial!.id, payload)
      : await createEstimateOnWeb(payload);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    router.push(`/${slug}/estimates/${res.id ?? initial!.id}`);
    router.refresh();
  }

  const inputCls =
    'w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary';
  const miniLabel =
    'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* MAIN */}
      <div className="space-y-6">
        <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
          <label className={miniLabel}>What&apos;s the job?</label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Loft conversion & rear extension"
          />
          <div className="mt-4">
            <TemplatePicker
              value={projectType}
              onChange={setProjectType}
              label="Type of work"
              hint="Sets the project timeline if this quote is accepted — a decorator gets a short one, a full build gets eight stages. Editable later."
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={miniLabel}>Client / prospect name</label>
              <input
                className={inputCls}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <label className={miniLabel}>Email (optional)</label>
              <input
                className={inputCls}
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={miniLabel}>Phone (optional)</label>
              <input
                className={inputCls}
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
            <div>
              <label className={miniLabel}>Site address (optional)</label>
              <input
                className={inputCls}
                value={addr1}
                onChange={(e) => setAddr1(e.target.value)}
              />
            </div>
            <div>
              <label className={miniLabel}>Town / city</label>
              <input
                className={inputCls}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className={miniLabel}>Postcode</label>
              <input
                className={inputCls}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* LINES */}
        <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Cost build-up</h2>
            <button
              type="button"
              onClick={() => setRows((p) => [...p, blankRow()])}
              className="rounded-md border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-canvas"
            >
              + Add line
            </button>
          </div>
          <p className="mb-4 text-xs text-ink-muted">
            Enter your cost per unit and a markup %. The client price is worked
            out for you.
          </p>

          <div className="space-y-3">
            {rows.map((r, idx) => {
              const price = linePricePence({
                quantity: num(r.quantityText, 0),
                unit_cost_pence: poundsToPence(r.unitCostText),
                markup_percent: num(r.markupText, 0),
              });
              return (
                <div
                  key={r.key}
                  className="rounded-lg border border-hairline bg-canvas p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      Line {idx + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        className="text-xs font-semibold text-[#B23B1D] hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {KINDS.map((k) => {
                      const active = r.kind === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKind(r.key, k)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            active
                              ? 'border-primary bg-primary text-white'
                              : 'border-hairline bg-white text-ink'
                          }`}
                        >
                          {ESTIMATE_LINE_KIND_LABELS[k]}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    className={inputCls}
                    value={r.description}
                    onChange={(e) => patch(r.key, { description: e.target.value })}
                    placeholder="Description"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className={miniLabel}>Qty</label>
                      <input
                        className={inputCls}
                        inputMode="decimal"
                        value={r.quantityText}
                        onChange={(e) =>
                          patch(r.key, {
                            quantityText: e.target.value.replace(/[^0-9.]/g, ''),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className={miniLabel}>Unit</label>
                      <input
                        className={inputCls}
                        value={r.unit}
                        onChange={(e) => patch(r.key, { unit: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={miniLabel}>Cost £/unit</label>
                      <input
                        className={inputCls}
                        inputMode="decimal"
                        value={r.unitCostText}
                        onChange={(e) =>
                          patch(r.key, {
                            unitCostText: e.target.value.replace(/[^0-9.]/g, ''),
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className={miniLabel}>Markup %</label>
                      <input
                        className={inputCls}
                        inputMode="decimal"
                        value={r.markupText}
                        onChange={(e) =>
                          patch(r.key, {
                            markupText: e.target.value.replace(/[^0-9.]/g, ''),
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wide text-ink-muted">
                      Client price
                    </span>
                    <span className="text-sm font-extrabold text-ink">
                      {gbp(price)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {savedRates.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-ink-muted">
                Or pull one in from your saved rates — every figure stays
                editable:
              </p>
              <div className="flex flex-wrap gap-2">
                {savedRates.map((rate) => (
                  <button
                    key={rate.id}
                    type="button"
                    onClick={() => addFromRate(rate)}
                    className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-left text-xs hover:border-primary"
                  >
                    <span className="block font-bold text-ink">
                      {rate.description}
                    </span>
                    <span className="text-ink-muted">
                      {gbp(rate.default_unit_cost_pence)}/{rate.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* NOTES */}
        <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
          <label className={miniLabel}>Notes for the client (optional)</label>
          <textarea
            className={`${inputCls} min-h-[90px]`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Assumptions, exclusions, access notes…"
          />
        </section>
      </div>

      {/* SIDEBAR: options + totals */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
          <label className={miniLabel}>VAT</label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {VAT_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setVatMode(m)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  vatMode === m
                    ? 'border-primary bg-primary text-white'
                    : 'border-hairline bg-white text-ink'
                }`}
              >
                {VAT_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <label className={miniLabel}>Quote valid for</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { days: 14 as number | null, label: '14 days' },
              { days: 30 as number | null, label: '30 days' },
              { days: null as number | null, label: 'No expiry' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setValidityDays(p.days);
                  setValidityTouched(true);
                }}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  validityDays === p.days
                    ? 'border-primary bg-primary text-white'
                    : 'border-hairline bg-white text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
          <Row label="Subtotal" value={gbp(totals.subtotal_pence)} />
          {vatMode === 'standard' && (
            <Row label="VAT (20%)" value={gbp(totals.vat_pence)} />
          )}
          <div className="my-2 h-px bg-hairline" />
          <Row label="Total" value={gbp(totals.total_pence)} strong />
          <p className="mt-2 text-[11px] text-ink-muted">
            Your margin: {gbp(totals.margin_pence)} (
            {Math.round(marginPercent(totals))}%)
          </p>
        </section>

        {error && (
          <div className="rounded-lg border border-[#E7B7A6] bg-[#FAECE7] p-3 text-xs text-[#B23B1D]">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSave || submitting}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save quote'}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span
        className={`text-sm ${
          strong ? 'font-extrabold text-ink' : 'font-semibold text-ink-muted'
        }`}
      >
        {label}
      </span>
      <span
        className={`${strong ? 'text-xl font-extrabold' : 'text-sm font-bold'} text-ink`}
      >
        {value}
      </span>
    </div>
  );
}
