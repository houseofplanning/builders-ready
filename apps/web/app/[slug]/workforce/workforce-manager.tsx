'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type Resource,
  type ResourceDocument,
  type ResourceKind,
  type RateUnit,
  RESOURCE_KIND_LABELS,
  RATE_UNIT_LABELS,
  TRADE_CATEGORIES,
  PLANT_TYPES,
  DOCUMENT_TYPES,
  certStatus,
  daysToExpiry,
  isPermanent,
  isPlant,
} from '@br/shared';
import {
  saveResource,
  archiveResource,
  addResourceDocument,
  deleteResourceDocument,
  addTeamMemberResource,
  type ResourceInput,
} from '@/lib/server-actions/resources';

export interface ResourceWithDocs extends Resource {
  documents: ResourceDocument[];
}

export interface AccountMember {
  user_id: string;
  full_name: string;
  role: 'owner' | 'pm';
  linked: boolean;
}

const money = (pence: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(pence / 100);

function rateLabel(r: Resource): string {
  if (r.cost_rate_pence == null) return 'No rate set';
  const amt = money(r.cost_rate_pence);
  if (r.cost_rate_unit === 'annual') return `${amt}/yr`;
  if (r.cost_rate_unit === 'hour') return `${amt}/hr`;
  return `${amt}/day`;
}

function poundsToPence(s: string): number | null {
  const t = s.replace(/[£,\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
const penceToPounds = (p: number | null) => (p == null ? '' : String(p / 100));
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/** Worst cert status across a resource's documents, for the summary chip. */
function worstCert(docs: ResourceDocument[]): { label: string; cls: string } {
  if (docs.length === 0) return { label: 'No certs', cls: 'bg-canvas text-ink-muted' };
  let expired = 0;
  let expiring = 0;
  for (const d of docs) {
    const s = certStatus(d.expires_on);
    if (s === 'expired') expired++;
    else if (s === 'expiring') expiring++;
  }
  if (expired) return { label: `${expired} expired`, cls: 'bg-red-50 text-red-700' };
  if (expiring) return { label: `${expiring} expiring`, cls: 'bg-amber-50 text-amber-700' };
  return { label: `${docs.length} cert${docs.length > 1 ? 's' : ''} OK`, cls: 'bg-emerald-50 text-emerald-700' };
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

type Draft = {
  id?: string;
  kind: ResourceKind;
  display_name: string;
  trade: string;
  unit: RateUnit;
  amount: string;
  on_cost: string;
  engaged_from: string;
  engaged_to: string;
  phone: string;
  email: string;
};

const emptyDraft = (): Draft => ({
  kind: 'operative',
  display_name: '',
  trade: '',
  unit: 'day',
  amount: '',
  on_cost: '',
  engaged_from: '',
  engaged_to: '',
  phone: '',
  email: '',
});

const toDraft = (r: ResourceWithDocs): Draft => ({
  id: r.id,
  kind: r.kind,
  display_name: r.display_name,
  trade: r.trade ?? '',
  unit: r.cost_rate_unit,
  amount: penceToPounds(r.cost_rate_pence),
  on_cost: r.on_cost_percent ? String(r.on_cost_percent) : '',
  engaged_from: r.engaged_from ?? '',
  engaged_to: r.engaged_to ?? '',
  phone: r.phone ?? '',
  email: r.email ?? '',
});

export function WorkforceManager({
  initialResources,
  accountTeam = [],
}: {
  initialResources: ResourceWithDocs[];
  accountTeam?: AccountMember[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editingDocs, setEditingDocs] = useState<ResourceDocument[]>([]);

  const team = useMemo(() => initialResources.filter((r) => isPermanent(r.kind)), [initialResources]);
  const subs = useMemo(() => initialResources.filter((r) => r.kind === 'subcontractor'), [initialResources]);
  const plant = useMemo(() => initialResources.filter((r) => isPlant(r.kind)), [initialResources]);
  const expiringCount = useMemo(
    () =>
      initialResources.reduce(
        (n, r) => n + r.documents.filter((d) => ['expiring', 'expired'].includes(certStatus(d.expires_on))).length,
        0,
      ),
    [initialResources],
  );

  function openNew(kind: ResourceKind = 'operative') {
    setEditing({ ...emptyDraft(), kind });
    setEditingDocs([]);
  }
  function openEdit(r: ResourceWithDocs) {
    setEditing(toDraft(r));
    setEditingDocs(r.documents);
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Team &amp; rates</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Your permanent team and the subcontractors you bring in, with their day rates or
            salary. These costs feed the live margin on every job and the schedule.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openNew('operative')}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            + Add person
          </button>
          <button
            onClick={() => openNew('plant')}
            className="rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary hover:bg-canvas"
          >
            + Add plant / equipment
          </button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-hairline">
          {team.length} on the team
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-hairline">
          {subs.length} subcontractor{subs.length === 1 ? '' : 's'}
        </span>
        {expiringCount > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 ring-1 ring-amber-200">
            ⚠ {expiringCount} cert{expiringCount === 1 ? '' : 's'} expiring or expired
          </span>
        )}
      </div>

      {accountTeam.length > 0 && <AccountTeamSection members={accountTeam} onChanged={() => router.refresh()} />}

      <Section title="Your team" subtitle="Permanent staff and operatives, on the books.">
        {team.length === 0 ? (
          <Empty label="No team members yet. Add your first operative or office staff." />
        ) : (
          <Grid>
            {team.map((r) => (
              <PersonCard key={r.id} r={r} onEdit={() => openEdit(r)} />
            ))}
          </Grid>
        )}
      </Section>

      <Section title="Subcontractors" subtitle="Hired in for a job or a few weeks, paid a day rate.">
        {subs.length === 0 ? (
          <Empty label="No subcontractors yet. Add one, or hire from the marketplace." />
        ) : (
          <Grid>
            {subs.map((r) => (
              <PersonCard key={r.id} r={r} onEdit={() => openEdit(r)} />
            ))}
          </Grid>
        )}
      </Section>

      <Section title="Plant & equipment" subtitle="Diggers, scaffold, vans and tools you schedule, with their hire rate.">
        {plant.length === 0 ? (
          <Empty label="No plant yet. Add a digger, scaffold or vehicle to schedule it with a hire rate." />
        ) : (
          <Grid>
            {plant.map((r) => (
              <PersonCard key={r.id} r={r} onEdit={() => openEdit(r)} />
            ))}
          </Grid>
        )}
      </Section>

      {editing && (
        <EditDrawer
          draft={editing}
          docs={editingDocs}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
          onDocsChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

function AccountTeamSection({ members, onChanged }: { members: AccountMember[]; onChanged: () => void }) {
  return (
    <Section title="Account team (owner & PMs)" subtitle="Your logins. Add them to the schedule to book them on jobs.">
      <Grid>
        {members.map((m) => (
          <AccountMemberCard key={m.user_id} m={m} onChanged={onChanged} />
        ))}
      </Grid>
    </Section>
  );
}

function AccountMemberCard({ m, onChanged }: { m: AccountMember; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {initials(m.full_name) || '?'}
        </span>
        <div className="min-w-0">
          <div className="truncate font-bold">{m.full_name}</div>
          <div className="text-xs text-ink-muted">{m.role === 'owner' ? 'Owner' : 'Project manager'}</div>
        </div>
      </div>
      {m.linked ? (
        <span className="flex-none rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">On schedule</span>
      ) : (
        <button
          onClick={async () => {
            setBusy(true);
            await addTeamMemberResource({ user_id: m.user_id, display_name: m.full_name });
            setBusy(false);
            onChanged();
          }}
          disabled={busy}
          className="flex-none rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary hover:bg-canvas disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add to schedule'}
        </button>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">{title}</h2>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);

const Empty = ({ label }: { label: string }) => (
  <div className="rounded-xl border border-dashed border-hairline bg-white/60 p-6 text-center text-sm text-ink-muted">
    {label}
  </div>
);

function PersonCard({ r, onEdit }: { r: ResourceWithDocs; onEdit: () => void }) {
  const cert = worstCert(r.documents);
  return (
    <button
      onClick={onEdit}
      className="flex flex-col rounded-xl border border-hairline bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {initials(r.display_name) || '?'}
        </span>
        <div className="min-w-0">
          <div className="truncate font-bold">{r.display_name}</div>
          <div className="truncate text-xs text-ink-muted">
            {RESOURCE_KIND_LABELS[r.kind]}
            {r.trade ? ` · ${r.trade}` : ''}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-canvas px-2 py-1 text-xs font-bold text-ink">{rateLabel(r)}</span>
        {isPermanent(r.kind) && r.on_cost_percent > 0 && (
          <span className="rounded-md bg-canvas px-2 py-1 text-xs text-ink-muted">
            +{r.on_cost_percent}% on-cost
          </span>
        )}
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${cert.cls}`}>{cert.label}</span>
      </div>
      {!isPermanent(r.kind) && (r.engaged_from || r.engaged_to) && (
        <div className="mt-2 text-xs text-ink-muted">
          Engaged {fmtDate(r.engaged_from)}
          {r.engaged_to ? ` – ${fmtDate(r.engaged_to)}` : ''}
        </div>
      )}
    </button>
  );
}

function EditDrawer({
  draft,
  docs,
  onClose,
  onSaved,
  onDocsChanged,
}: {
  draft: Draft;
  docs: ResourceDocument[];
  onClose: () => void;
  onSaved: () => void;
  onDocsChanged: () => void;
}) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const perm = isPermanent(d.kind);
  const plant = isPlant(d.kind);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setErr(null);
    const input: ResourceInput = {
      id: d.id,
      kind: d.kind,
      display_name: d.display_name,
      trade: d.trade || null,
      phone: d.phone || null,
      email: d.email || null,
      cost_rate_pence: poundsToPence(d.amount),
      cost_rate_unit: d.unit,
      on_cost_percent: perm ? Number(d.on_cost) || 0 : 0,
      engaged_from: d.engaged_from || null,
      engaged_to: d.engaged_to || null,
    };
    const res = await saveResource(input);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not save.');
    onSaved();
  }

  async function remove() {
    if (!d.id) return;
    if (!confirm(`Remove ${d.display_name} from the roster? Their job history is kept.`)) return;
    setBusy(true);
    const res = await archiveResource(d.id);
    setBusy(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="text-lg font-extrabold">
            {d.id ? 'Edit' : 'Add'} {isPlant(d.kind) ? 'plant / equipment' : 'person'}
          </h3>
          <button onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Field label={plant ? 'Equipment name' : 'Name'}>
            <input
              value={d.display_name}
              onChange={(e) => set('display_name', e.target.value)}
              placeholder={plant ? 'e.g. 3-ton digger, Scaffold tower A' : 'e.g. Luke Evans'}
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={d.kind}
                onChange={(e) => set('kind', e.target.value as ResourceKind)}
                className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
              >
                <option value="operative">{RESOURCE_KIND_LABELS.operative}</option>
                <option value="staff">{RESOURCE_KIND_LABELS.staff}</option>
                <option value="subcontractor">{RESOURCE_KIND_LABELS.subcontractor}</option>
                <option value="plant">{RESOURCE_KIND_LABELS.plant}</option>
              </select>
            </Field>
            {plant ? (
              <Field label="Equipment type">
                <select
                  value={d.trade}
                  onChange={(e) => set('trade', e.target.value)}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                >
                  <option value="">Select type…</option>
                  {PLANT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Trade">
                <select
                  value={d.trade}
                  onChange={(e) => set('trade', e.target.value)}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                >
                  <option value="">None / general</option>
                  {TRADE_CATEGORIES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={plant ? 'Hire basis' : 'Pay basis'}>
              <select
                value={d.unit}
                onChange={(e) => set('unit', e.target.value as RateUnit)}
                className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
              >
                <option value="day">{plant ? 'Per day' : RATE_UNIT_LABELS.day}</option>
                <option value="hour">{plant ? 'Per hour' : RATE_UNIT_LABELS.hour}</option>
                {perm && <option value="annual">{RATE_UNIT_LABELS.annual}</option>}
              </select>
            </Field>
            <Field
              label={
                plant
                  ? d.unit === 'hour'
                    ? 'Hire rate (£/hr)'
                    : 'Hire rate (£/day)'
                  : d.unit === 'annual'
                    ? 'Annual salary (£)'
                    : d.unit === 'hour'
                      ? 'Hourly (£)'
                      : 'Day rate (£)'
              }
            >
              <input
                inputMode="decimal"
                value={d.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder={d.unit === 'annual' ? '35000' : d.unit === 'hour' ? '22' : '180'}
                className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {perm ? (
            <Field label="On-cost % (optional)" hint="NI, pension, holiday. Shows the true daily cost.">
              <input
                inputMode="decimal"
                value={d.on_cost}
                onChange={(e) => set('on_cost', e.target.value)}
                placeholder="e.g. 25"
                className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
              />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label={plant ? 'On hire from' : 'Engaged from'}>
                <input
                  type="date"
                  value={d.engaged_from}
                  onChange={(e) => set('engaged_from', e.target.value)}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                />
              </Field>
              <Field label={plant ? 'On hire to' : 'Engaged to'}>
                <input
                  type="date"
                  value={d.engaged_to}
                  onChange={(e) => set('engaged_to', e.target.value)}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={plant ? 'Supplier phone' : 'Phone'}>
              <input
                value={d.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
              />
            </Field>
            <Field label={plant ? 'Supplier / hire co.' : 'Email'}>
              <input
                value={d.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {d.id ? (
            <CertsEditor resourceId={d.id} docs={docs} onChanged={onDocsChanged} />
          ) : (
            <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">
              Save this first, then add certs, insurance or inspection records.
            </p>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline px-5 py-4">
          {d.id ? (
            <button onClick={remove} disabled={busy} className="text-sm font-semibold text-red-600 hover:underline">
              Remove
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertsEditor({
  resourceId,
  docs,
  onChanged,
}: {
  resourceId: string;
  docs: ResourceDocument[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<string>(DOCUMENT_TYPES[0]);
  const [ref, setRef] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    await addResourceDocument({
      resource_id: resourceId,
      doc_type: type,
      reference: ref || null,
      issued_on: null,
      expires_on: expires || null,
    });
    setBusy(false);
    setAdding(false);
    setRef('');
    setExpires('');
    onChanged();
  }
  async function del(id: string) {
    setBusy(true);
    await deleteResourceDocument(id);
    setBusy(false);
    onChanged();
  }

  return (
    <div className="rounded-lg border border-hairline p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Certs &amp; insurance</span>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-bold text-primary hover:underline">
            + Add
          </button>
        )}
      </div>
      {docs.length === 0 && !adding && <p className="text-xs text-ink-muted">None added yet.</p>}
      <ul className="space-y-1.5">
        {docs.map((doc) => {
          const dte = daysToExpiry(doc.expires_on);
          const st = certStatus(doc.expires_on);
          const cls =
            st === 'expired'
              ? 'text-red-700'
              : st === 'expiring'
                ? 'text-amber-700'
                : 'text-ink-muted';
          return (
            <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-semibold">{doc.doc_type}</span>
                {doc.expires_on && (
                  <span className={`ml-2 text-xs ${cls}`}>
                    {st === 'expired'
                      ? `expired ${fmtDate(doc.expires_on)}`
                      : `expires ${fmtDate(doc.expires_on)}${dte != null ? ` (${dte}d)` : ''}`}
                  </span>
                )}
              </span>
              <button onClick={() => del(doc.id)} disabled={busy} className="text-xs text-ink-muted hover:text-red-600">
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      {adding && (
        <div className="mt-2 space-y-2 border-t border-hairline pt-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Reference / number"
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="text-xs font-semibold text-ink-muted">
              Cancel
            </button>
            <button onClick={add} disabled={busy} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
              Add cert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span>}
    </label>
  );
}
