'use client';

import { useMemo, useState } from 'react';
import {
  gbp,
  formatDate,
  linePricePence,
  generateQuoteFromTemplate,
  paintingAreasFromRooms,
  type QuoteTemplate,
  type PriceBook,
  type SavedRate,
} from '@br/shared';
import { EstimateForm, type EstimateFormSeed } from '../estimate-form';

type Surface = 'good' | 'patch' | 'bare';
type Woodwork = 'none' | 'some' | 'lots';

const SURFACES: { key: Surface; label: string }[] = [
  { key: 'good', label: 'Sound / painted' },
  { key: 'patch', label: 'Needs filling' },
  { key: 'bare', label: 'Bare / new plaster' },
];
const WOODWORK: { key: Woodwork; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'some', label: 'Some (door, skirting)' },
  { key: 'lots', label: 'Lots' },
];
const COATS = [1, 2, 3];

interface RoomRow {
  key: string;
  length: string;
  width: string;
  height: string;
  ceiling: boolean;
}
let roomSeq = 0;
function blankRoom(): RoomRow {
  roomSeq += 1;
  return { key: `r${roomSeq}`, length: '4', width: '3', height: '2.4', ceiling: true };
}

function onlyNum(s: string): string {
  return s.replace(/[^0-9.]/g, '');
}
function num(s: string, fallback = 0): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export function TemplateQuoteBuilder({
  slug,
  templates,
  priceBook,
  savedRates,
}: {
  slug: string;
  templates: QuoteTemplate[];
  priceBook: PriceBook;
  savedRates: SavedRate[];
}) {
  const [selected, setSelected] = useState<QuoteTemplate | null>(null);
  const [seed, setSeed] = useState<EstimateFormSeed | null>(null);

  // painter inputs — measure by rooms (auto m²) with a direct-m² fallback
  const [mode, setMode] = useState<'rooms' | 'area'>('rooms');
  const [rooms, setRooms] = useState<RoomRow[]>([blankRoom()]);
  const [directWall, setDirectWall] = useState('40');
  const [directCeilingOn, setDirectCeilingOn] = useState(true);
  const [directCeiling, setDirectCeiling] = useState('14');
  const [coats, setCoats] = useState(2);
  const [surface, setSurface] = useState<Surface>('patch');
  const [woodwork, setWoodwork] = useState<Woodwork>('some');
  const [margin, setMargin] = useState('20');

  const areas = useMemo(() => {
    if (mode === 'area') {
      return {
        wall_area_m2: num(directWall),
        ceiling_area_m2: directCeilingOn ? num(directCeiling) : 0,
      };
    }
    return paintingAreasFromRooms(
      rooms.map((r) => ({
        length_m: num(r.length),
        width_m: num(r.width),
        height_m: num(r.height),
        paint_ceiling: r.ceiling,
      })),
    );
  }, [mode, rooms, directWall, directCeilingOn, directCeiling]);

  const result = useMemo(() => {
    if (!selected) return null;
    return generateQuoteFromTemplate(
      selected.engine_key,
      {
        wall_area_m2: areas.wall_area_m2,
        paint_ceiling: areas.ceiling_area_m2 > 0,
        ceiling_area_m2: areas.ceiling_area_m2,
        coats,
        surface,
        woodwork,
        margin_percent: num(margin),
      },
      priceBook,
    );
  }, [selected, areas, coats, surface, woodwork, margin, priceBook]);

  function updateRoom(key: string, patch: Partial<RoomRow>) {
    setRooms((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRoom() {
    setRooms((prev) => [...prev, blankRoom()]);
  }
  function removeRoom(key: string) {
    setRooms((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  const totals = useMemo(() => {
    if (!result) return { cost: 0, price: 0 };
    let cost = 0;
    let price = 0;
    for (const l of result.lines) {
      cost += Math.round(l.quantity * l.unit_cost_pence);
      price += linePricePence(l);
    }
    return { cost, price };
  }, [result]);

  // ---- Built: hand off to the normal estimate editor, pre-filled -----------
  if (seed) {
    return (
      <div>
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setSeed(null)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            ← Back to questions
          </button>
        </div>
        <EstimateForm slug={slug} savedRates={savedRates} seed={seed} />
      </div>
    );
  }

  // ---- Pick a template -----------------------------------------------------
  if (!selected) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.length === 0 && (
          <p className="text-sm text-ink-muted">No templates available yet.</p>
        )}
        {templates.map((t) => {
          const supported = t.engine_key === 'painting_decorating';
          return (
            <button
              key={t.id}
              type="button"
              disabled={!supported}
              onClick={() => supported && setSelected(t)}
              className={`rounded-card border bg-white p-5 text-left shadow-card transition ${
                supported
                  ? 'border-hairline hover:border-primary'
                  : 'cursor-not-allowed border-hairline opacity-55'
              }`}
            >
              <div className="text-base font-extrabold text-ink">{t.name}</div>
              {t.summary && (
                <div className="mt-1 text-sm text-ink-muted">{t.summary}</div>
              )}
              {!supported && (
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  Coming soon
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ---- Question form (painter) ---------------------------------------------
  const inputCls =
    'w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary';
  const miniLabel = 'mb-1 block text-sm font-extrabold text-ink';

  function chip(active: boolean) {
    return `rounded-full border px-3 py-1.5 text-xs font-semibold ${
      active ? 'border-primary bg-primary text-white' : 'border-hairline bg-white text-ink'
    }`;
  }

  function onBuild() {
    if (!selected || !result || result.lines.length === 0) return;
    setSeed({
      title: selected.name,
      project_type: selected.project_type ?? 'painting',
      priced_on: result.priced_on,
      lines: result.lines.map((l) => ({
        kind: l.kind,
        saved_rate_id: null,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_cost_pence: l.unit_cost_pence,
        markup_percent: l.markup_percent,
        client_supplied: false,
      })),
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← All templates
        </button>

        <section className="space-y-4 rounded-card border border-hairline bg-white p-5 shadow-card">
          <h2 className="text-sm font-extrabold">{selected.name}</h2>

          {/* mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('rooms')}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                mode === 'rooms'
                  ? 'border-primary bg-primary text-white'
                  : 'border-hairline bg-white text-ink'
              }`}
            >
              By room
            </button>
            <button
              type="button"
              onClick={() => setMode('area')}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                mode === 'area'
                  ? 'border-primary bg-primary text-white'
                  : 'border-hairline bg-white text-ink'
              }`}
            >
              I know the m²
            </button>
          </div>

          {mode === 'rooms' ? (
            <div className="space-y-3">
              {rooms.map((r, idx) => (
                <div key={r.key} className="rounded-lg border border-hairline bg-canvas p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      Room {idx + 1}
                    </span>
                    {rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRoom(r.key)}
                        className="text-xs font-semibold text-[#B23B1D] hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['length', 'width', 'height'] as const).map((dim) => (
                      <div key={dim}>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                          {dim === 'length' ? 'Length' : dim === 'width' ? 'Width' : 'Height'} (m)
                        </label>
                        <input
                          className={inputCls}
                          inputMode="decimal"
                          value={r[dim]}
                          onChange={(e) => updateRoom(r.key, { [dim]: onlyNum(e.target.value) })}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={r.ceiling}
                      onChange={(e) => updateRoom(r.key, { ceiling: e.target.checked })}
                    />
                    Paint this ceiling
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={addRoom}
                className="w-full rounded-lg border border-dashed border-primary px-3 py-2 text-xs font-bold text-primary hover:bg-canvas"
              >
                + Add a room
              </button>
              <p className="text-[11px] text-ink-muted">
                ≈ {areas.wall_area_m2} m² walls
                {areas.ceiling_area_m2 > 0 ? ` + ${areas.ceiling_area_m2} m² ceiling` : ''} · 10%
                knocked off walls for doors &amp; windows.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={miniLabel}>Wall area (m²)</label>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={directWall}
                  onChange={(e) => setDirectWall(onlyNum(e.target.value))}
                />
              </div>
              <div>
                <label className={miniLabel}>Ceiling</label>
                <label className="flex items-center gap-2 py-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={directCeilingOn}
                    onChange={(e) => setDirectCeilingOn(e.target.checked)}
                  />
                  Paint the ceiling(s)
                </label>
                {directCeilingOn && (
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    value={directCeiling}
                    onChange={(e) => setDirectCeiling(onlyNum(e.target.value))}
                    placeholder="Ceiling area m²"
                  />
                )}
              </div>
            </div>
          )}

          <div>
            <label className={miniLabel}>Coats</label>
            <div className="flex flex-wrap gap-2">
              {COATS.map((c) => (
                <button key={c} type="button" onClick={() => setCoats(c)} className={chip(coats === c)}>
                  {c} coat{c > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={miniLabel}>Surface condition</label>
            <div className="flex flex-wrap gap-2">
              {SURFACES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSurface(s.key)}
                  className={chip(surface === s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={miniLabel}>Woodwork (gloss / satin)</label>
            <div className="flex flex-wrap gap-2">
              {WOODWORK.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWoodwork(w.key)}
                  className={chip(woodwork === w.key)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-[160px]">
            <label className={miniLabel}>Your margin (%)</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(onlyNum(e.target.value))}
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Applied to every line on top of cost.
            </p>
          </div>
        </section>
      </div>

      {/* preview + build */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
          <h3 className="mb-2 text-sm font-extrabold">Draft quote</h3>
          {result && result.lines.length > 0 ? (
            <>
              <div className="space-y-1">
                {result.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-ink-muted">{l.description}</span>
                    <span className="shrink-0 font-bold text-ink">
                      {gbp(linePricePence(l))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="my-3 h-px bg-hairline" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-muted">Your cost</span>
                <span className="font-bold text-ink">{gbp(totals.cost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-ink">Client (ex-VAT)</span>
                <span className="text-xl font-extrabold text-ink">{gbp(totals.price)}</span>
              </div>
              {result.priced_on && (
                <p className="mt-2 text-[11px] text-ink-muted">
                  Materials priced as of {formatDate(result.priced_on)} · editable
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-muted">
              {result?.warnings[0] ?? 'Enter a wall or ceiling area.'}
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={onBuild}
          disabled={!result || result.lines.length === 0}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Build quote
        </button>
      </div>
    </div>
  );
}
