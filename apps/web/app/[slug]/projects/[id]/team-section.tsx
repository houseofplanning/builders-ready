'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type ResourceKind,
  type RateUnit,
  type BookingKind,
  RESOURCE_KIND_LABELS,
  isPermanent,
} from '@br/shared';
import {
  createProjectAssignment,
  removeResourceFromProject,
} from '@/lib/server-actions/assignments';

export interface AssignableResource {
  id: string;
  display_name: string;
  kind: ResourceKind;
  trade: string | null;
  cost_rate_pence: number | null;
  cost_rate_unit: RateUnit;
}

export interface BookingRow {
  resource_id: string;
  resource_name: string;
  kind: ResourceKind;
  trade: string | null;
  start: string;
  end: string;
  cost_pence: number;
}

export interface StageOpt {
  id: string;
  name: string;
}

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

interface Grouped {
  resource_id: string;
  name: string;
  kind: ResourceKind;
  trade: string | null;
  days: number;
  from: string;
  to: string;
  cost: number;
}

export function TeamSection({
  projectId,
  canWrite,
  resources,
  stages,
  bookings,
  loggedCostPence,
  contractValuePence,
}: {
  projectId: string;
  canWrite: boolean;
  resources: AssignableResource[];
  stages: StageOpt[];
  bookings: BookingRow[];
  loggedCostPence: number;
  contractValuePence: number;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const grouped = useMemo<Grouped[]>(() => {
    const m = new Map<string, Grouped>();
    for (const b of bookings) {
      const g = m.get(b.resource_id) ?? {
        resource_id: b.resource_id,
        name: b.resource_name,
        kind: b.kind,
        trade: b.trade,
        days: 0,
        from: b.start,
        to: b.end,
        cost: 0,
      };
      g.days += 1;
      g.cost += b.cost_pence;
      if (b.start < g.from) g.from = b.start;
      if (b.end > g.to) g.to = b.end;
      m.set(b.resource_id, g);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const scheduled = grouped.reduce((n, g) => n + g.cost, 0);
  const subCost = grouped.filter((g) => !isPermanent(g.kind)).reduce((n, g) => n + g.cost, 0);
  const labourCost = scheduled - subCost;
  const totalToBusiness = loggedCostPence + scheduled;
  const margin = contractValuePence > 0 ? ((contractValuePence - totalToBusiness) / contractValuePence) * 100 : null;

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">Team on this job</h2>
          <span className="text-xs text-ink-muted">{grouped.length} assigned</span>
        </div>
        {canWrite && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary hover:bg-canvas"
          >
            {adding ? 'Close' : '+ Assign'}
          </button>
        )}
      </header>

      {/* cost summary */}
      <div className="grid grid-cols-2 gap-3 border-t border-hairline px-5 py-4 sm:grid-cols-4">
        <Stat label="Scheduled team cost" value={money(scheduled)} />
        <Stat label="Labour / subbies" value={`${money(labourCost)} / ${money(subCost)}`} small />
        <Stat label="Cost to business" value={money(totalToBusiness)} hint={`${money(loggedCostPence)} logged + ${money(scheduled)} scheduled`} />
        <Stat
          label="Margin (incl. scheduled)"
          value={margin == null ? '—' : `${margin.toFixed(1)}%`}
          good={margin != null && margin >= 0}
        />
      </div>

      {canWrite && adding && (
        <AssignForm
          projectId={projectId}
          resources={resources}
          stages={stages}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      <ul className="border-t border-hairline">
        {grouped.length === 0 ? (
          <li className="px-5 py-8 text-center text-xs text-ink-muted">
            No one assigned yet. {canWrite ? 'Assign your crew and subbies above.' : ''}
          </li>
        ) : (
          grouped.map((g) => (
            <li key={g.resource_id} className="flex items-center gap-3 border-b border-hairline px-5 py-3 last:border-b-0">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                {initials(g.name) || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{g.name}</span>
                  {g.trade && (
                    <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {g.trade}
                    </span>
                  )}
                  {!isPermanent(g.kind) && (
                    <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-bold text-accent-deep">
                      {RESOURCE_KIND_LABELS.subcontractor}
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-muted">
                  {fmtDay(g.from)} – {fmtDay(g.to)} · {g.days} day{g.days === 1 ? '' : 's'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{money(g.cost)}</div>
                {canWrite && (
                  <RemoveBtn projectId={projectId} resourceId={g.resource_id} onDone={() => router.refresh()} />
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  good,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  good?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className={`font-extrabold ${small ? 'text-sm' : 'text-lg'} ${good ? 'text-emerald-600' : 'text-ink'}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-ink-muted">{hint}</div>}
    </div>
  );
}

function AssignForm({
  projectId,
  resources,
  stages,
  onDone,
}: {
  projectId: string;
  resources: AssignableResource[];
  stages: StageOpt[];
  onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '');
  const [stageId, setStageId] = useState('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [kind, setKind] = useState<BookingKind>('work');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!resourceId) return setErr('Add someone on the Team & rates screen first.');
    setBusy(true);
    setErr(null);
    const res = await createProjectAssignment({
      project_id: projectId,
      resource_id: resourceId,
      stage_id: stageId || null,
      from_date: from,
      to_date: to,
      booking_kind: kind,
      note: note || null,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not assign.');
    onDone();
  }

  if (resources.length === 0) {
    return (
      <div className="border-t border-hairline px-5 py-4 text-sm text-ink-muted">
        No crew or subbies yet. Add people on the <span className="font-semibold">Team &amp; rates</span> screen, then assign them here.
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-hairline bg-canvas/40 px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Who">
          <select value={resourceId} onChange={(e) => setResourceId(e.target.value)} className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm">
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name}
                {r.trade ? ` · ${r.trade}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stage (optional)">
          <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm">
            <option value="">Whole project</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Type">
          <select value={kind} onChange={(e) => setKind(e.target.value as BookingKind)} className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm">
            <option value="work">Work</option>
            <option value="travel">Travel</option>
            <option value="unplanned">Unplanned</option>
            <option value="leave">Leave (no cost)</option>
          </select>
        </Field>
        <Field label="Note (optional)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 1st fix" className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm" />
        </Field>
      </div>
      <p className="text-[11px] text-ink-muted">One booking is created per weekday in the range (weekends skipped).</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
          {busy ? 'Assigning…' : 'Assign'}
        </button>
      </div>
    </div>
  );
}

function RemoveBtn({ projectId, resourceId, onDone }: { projectId: string; resourceId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        if (!confirm('Remove this person from the job?')) return;
        setBusy(true);
        await removeResourceFromProject(projectId, resourceId);
        setBusy(false);
        onDone();
      }}
      disabled={busy}
      className="text-[11px] text-ink-muted hover:text-red-600"
    >
      Remove
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
