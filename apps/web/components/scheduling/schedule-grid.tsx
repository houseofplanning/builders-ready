'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createProjectAssignment, removeResourceFromProject } from '@/lib/server-actions/assignments';

export interface GridCell {
  pid: string;
  label: string;
  colour: string;
  /** Resource is on more than one job this day. */
  clash?: boolean;
}
export interface GridRow {
  resourceId: string;
  name: string;
  badge: 'SUB' | 'PLANT' | null;
  cells: (GridCell | null)[];
}
export interface GridGroup {
  title: string;
  colour?: string;
  href?: string;
  rows: GridRow[];
}
export interface DayCol {
  iso: string;
  weekday: string;
  date: number;
  isToday: boolean;
  weekend: boolean;
}
export interface ProjectOpt {
  id: string;
  name: string;
  colour: string;
}

const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
const fmtIso = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

type Selected = { resourceId: string; name: string; dateIso: string; cell: GridCell | null };

export function ScheduleGrid({
  slug,
  span,
  days,
  groups,
  projects,
  canWrite,
}: {
  slug: string;
  span: number;
  days: DayCol[];
  groups: GridGroup[];
  projects: ProjectOpt[];
  canWrite: boolean;
}) {
  const [sel, setSel] = useState<Selected | null>(null);
  const cols = `200px repeat(${span}, 1fr)`;

  return (
    <>
      <div className="overflow-x-auto rounded-card border border-hairline bg-white shadow-card">
        <div style={{ minWidth: 200 + span * 40 }}>
          {/* header */}
          <div className="grid border-b border-hairline bg-canvas/50" style={{ gridTemplateColumns: cols }}>
            <div className="px-4 py-2 text-xs font-bold text-ink-muted">Team member</div>
            {days.map((d) => (
              <div key={d.iso} className={`border-l border-hairline px-1 py-2 text-center text-[11px] ${d.isToday ? 'bg-primary-soft' : d.weekend ? 'bg-canvas/40' : ''}`}>
                <div className="text-ink-muted">{d.weekday}</div>
                <div className={`font-bold ${d.isToday ? 'text-primary' : 'text-ink'}`}>{d.date}</div>
              </div>
            ))}
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <div className="flex items-center gap-2 bg-canvas/60 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
                {g.colour && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: g.colour }} />}
                {g.href ? (
                  <Link href={g.href} className="hover:underline">
                    {g.title}
                  </Link>
                ) : (
                  g.title
                )}
              </div>
              {g.rows.length === 0 ? (
                <div className="px-4 py-2 text-xs text-ink-muted">No one assigned.</div>
              ) : (
                g.rows.map((r) => (
                  <div key={r.resourceId} className="grid items-center border-b border-hairline last:border-b-0 hover:bg-canvas/30" style={{ gridTemplateColumns: cols }}>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{initials(r.name) || '?'}</span>
                      <span className="min-w-0 truncate text-sm font-semibold">
                        {r.name}
                        {r.badge && <span className="ml-1 text-[10px] font-bold text-accent-deep">{r.badge}</span>}
                      </span>
                    </div>
                    {r.cells.map((c, i) => {
                      const d = days[i]!;
                      return (
                        <button
                          key={d.iso}
                          onClick={canWrite ? () => setSel({ resourceId: r.resourceId, name: r.name, dateIso: d.iso, cell: c }) : undefined}
                          className={`h-full min-h-[38px] border-l border-hairline px-1 py-1.5 text-left ${d.isToday ? 'bg-primary-soft/40' : ''} ${canWrite ? 'hover:bg-primary-soft/60' : ''}`}
                        >
                          {c ? (
                            <span
                              className={`block truncate rounded-md px-1.5 py-1 text-[10px] font-bold text-white ${c.clash ? 'ring-2 ring-red-500' : ''}`}
                              style={{ background: c.colour }}
                              title={c.clash ? `Clash: ${r.name} is on more than one job this day` : c.label}
                            >
                              {c.clash ? '⚠ ' : ''}
                              {c.label}
                            </span>
                          ) : canWrite ? (
                            <span className="block text-center text-sm text-hairline">+</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {sel && (
        <CellDialog
          slug={slug}
          sel={sel}
          projects={projects}
          onClose={() => setSel(null)}
        />
      )}
    </>
  );
}

function CellDialog({ slug, sel, projects, onClose }: { slug: string; sel: Selected; projects: ProjectOpt[]; onClose: () => void }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(sel.cell?.pid ?? projects[0]?.id ?? '');
  const [toDate, setToDate] = useState(sel.dateIso);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function assign() {
    if (!projectId) return setErr('Pick a project.');
    setBusy(true);
    setErr(null);
    const res = await createProjectAssignment({
      project_id: projectId,
      resource_id: sel.resourceId,
      stage_id: null,
      from_date: sel.dateIso,
      to_date: toDate,
      booking_kind: 'work',
      note: null,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? 'Could not assign.');
    router.refresh();
    onClose();
  }

  async function remove() {
    if (!sel.cell) return;
    if (!confirm(`Remove ${sel.name} from ${sel.cell.label}?`)) return;
    setBusy(true);
    await removeResourceFromProject(sel.cell.pid, sel.resourceId);
    setBusy(false);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-card bg-white p-5 shadow-raised" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted">{fmtIso(sel.dateIso)}</div>
        <h3 className="mb-4 text-lg font-extrabold">{sel.name}</h3>

        {sel.cell ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-sm">
              <span className="h-3 w-3 rounded-sm" style={{ background: sel.cell.colour }} />
              <span className="font-semibold">{sel.cell.label}</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/${slug}/project-schedule/${sel.cell.pid}`} className="flex-1 rounded-lg border border-primary px-3 py-2 text-center text-sm font-bold text-primary hover:bg-canvas">
                Open project schedule
              </Link>
              <button onClick={remove} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
                Remove
              </button>
            </div>
            <p className="text-[11px] text-ink-muted">Remove takes them off this project (all days). For finer control open the project schedule.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">Project</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-lg border border-hairline px-3 py-2 text-sm">
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">Until (weekdays only)</span>
              <input type="date" value={toDate} min={sel.dateIso} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-lg border border-hairline px-3 py-2 text-sm" />
            </label>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted">Cancel</button>
              <button onClick={assign} disabled={busy} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
