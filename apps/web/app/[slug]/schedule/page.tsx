import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { ResourceKind } from '@br/shared';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; group?: string }>;
}

export const metadata = { title: 'Schedule · Builders Ready' };

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);
const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

const PALETTE = ['#0F4C5C', '#E07A5F', '#2F6DB5', '#3B8C6E', '#7A5AA6', '#B26A00', '#9A4B35'];

export default async function SchedulePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const view: 'week' | 'month' = sp.view === 'month' ? 'month' : 'week';
  const group: 'people' | 'projects' = sp.group === 'projects' ? 'projects' : 'people';
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/dashboard`);

  // Horizon starts Monday of the current week (UTC, matching 08:00Z bookings).
  const span = view === 'month' ? 28 : 7;
  const now = new Date();
  const diffToMon = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMon));
  const days = Array.from({ length: span }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
  const dayStr = days.map((d) => d.toISOString().slice(0, 10));
  const todayStr = now.toISOString().slice(0, 10);
  const endExcl = new Date(monday);
  endExcl.setUTCDate(monday.getUTCDate() + span);

  const supabase = await createSupabaseServer();
  const [{ data: resourceRows }, { data: projectRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from('resources')
      .select('id, display_name, kind, trade')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_name'),
    supabase
      .from('projects')
      .select('id, name, status')
      .eq('tenant_id', tenant.id)
      .in('status', ['active', 'on_hold'])
      .order('name'),
    supabase
      .from('assignments')
      .select('resource_id, project_id, starts_at, cost_pence')
      .eq('tenant_id', tenant.id)
      .gte('starts_at', `${dayStr[0]}T00:00:00Z`)
      .lt('starts_at', `${endExcl.toISOString().slice(0, 10)}T00:00:00Z`),
  ]);

  const resources = (resourceRows ?? []) as { id: string; display_name: string; kind: ResourceKind; trade: string | null }[];
  const projects = (projectRows ?? []) as { id: string; name: string; status: string }[];
  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const projectColour = new Map(projects.map((p, i) => [p.id, PALETTE[i % PALETTE.length]!]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  // peopleCell: rid -> date -> project_id (first booking that day)
  const peopleCell = new Map<string, Map<string, string>>();
  // projResources: pid -> rid -> set(date)
  const projResources = new Map<string, Map<string, Set<string>>>();
  const peopleBooked = new Set<string>();
  let horizonCost = 0;
  for (const a of assignmentRows ?? []) {
    const rid = a.resource_id as string;
    const pid = a.project_id as string;
    const date = (a.starts_at as string).slice(0, 10);
    const inner = peopleCell.get(rid) ?? new Map<string, string>();
    if (!inner.has(date)) inner.set(date, pid);
    peopleCell.set(rid, inner);
    const pr = projResources.get(pid) ?? new Map<string, Set<string>>();
    const dates = pr.get(rid) ?? new Set<string>();
    dates.add(date);
    pr.set(rid, dates);
    projResources.set(pid, pr);
    peopleBooked.add(rid);
    horizonCost += a.cost_pence != null ? Number(a.cost_pence) : 0;
  }

  // cover by trade (over the horizon)
  const byTrade = new Map<string, typeof resources>();
  for (const r of resources) {
    const key = r.trade || 'General / labour';
    (byTrade.get(key) ?? byTrade.set(key, []).get(key)!).push(r);
  }
  const cover = [...byTrade.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([trade, list]) => {
      const booked = list.filter((r) => peopleBooked.has(r.id)).length;
      return { trade, total: list.length, booked, free: list.length - booked };
    });

  const label = view === 'month' ? 'next 4 weeks' : 'this week';

  const Seg = ({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className={`px-3 py-1.5 text-xs font-bold ${active ? 'bg-primary text-white' : 'bg-white text-ink-muted hover:text-ink'}`}
    >
      {children}
    </Link>
  );

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-ink-muted">Where your team and subbies are, {label}. Open a project to assign people.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-hairline">
            <Seg active={group === 'people'} href={`/${slug}/schedule?view=${view}&group=people`}>People</Seg>
            <Seg active={group === 'projects'} href={`/${slug}/schedule?view=${view}&group=projects`}>Projects</Seg>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-hairline">
            <Seg active={view === 'week'} href={`/${slug}/schedule?view=week&group=${group}`}>Week</Seg>
            <Seg active={view === 'month'} href={`/${slug}/schedule?view=month&group=${group}`}>Month</Seg>
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="People scheduled" value={`${peopleBooked.size} of ${resources.length}`} />
        <Tile label={`Scheduled cost · ${label}`} value={money(horizonCost)} />
        <Tile label="Projects running" value={String(projects.length)} />
      </div>

      {cover.length > 0 && (
        <div className="mb-4 rounded-card border border-hairline bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-muted">Cover by trade</h3>
          <div className="flex flex-wrap gap-2">
            {cover.map((c) => (
              <div key={c.trade} className="flex items-center gap-2 rounded-lg border border-hairline bg-canvas/40 px-3 py-1.5 text-xs">
                <span className="font-bold">{c.trade}</span>
                <span className="text-ink-muted">{c.booked}/{c.total} out</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${c.free > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {c.free > 0 ? `${c.free} free` : 'full'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {resources.length === 0 ? (
        <Empty>No team yet. Add crew and subbies on <span className="font-semibold">Team &amp; rates</span>, then assign them on a project.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline bg-white shadow-card">
          <div style={{ minWidth: 200 + span * 40 }}>
            {/* header */}
            <div className="grid border-b border-hairline bg-canvas/50" style={{ gridTemplateColumns: `200px repeat(${span}, 1fr)` }}>
              <div className="px-4 py-2 text-xs font-bold text-ink-muted">{group === 'projects' ? 'Project / person' : 'Team member'}</div>
              {days.map((d, i) => {
                const isToday = dayStr[i] === todayStr;
                const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                return (
                  <div key={dayStr[i]} className={`border-l border-hairline px-1 py-2 text-center text-[11px] ${isToday ? 'bg-primary-soft' : weekend ? 'bg-canvas/40' : ''}`}>
                    <div className="text-ink-muted">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</div>
                    <div className={`font-bold ${isToday ? 'text-primary' : 'text-ink'}`}>{d.getUTCDate()}</div>
                  </div>
                );
              })}
            </div>

            {group === 'people'
              ? [...byTrade.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([trade, list]) => (
                    <GroupBlock key={trade} title={trade}>
                      {list.map((r) => (
                        <Row
                          key={r.id}
                          span={span}
                          name={r.display_name}
                          sub={r.kind === 'subcontractor'}
                          cells={dayStr.map((ds) => {
                            const pid = peopleCell.get(r.id)?.get(ds);
                            return pid ? { pid, label: projectName.get(pid) ?? 'Job', colour: projectColour.get(pid) ?? '#64748b', href: `/${slug}/project-schedule/${pid}` } : null;
                          })}
                          dayStr={dayStr}
                          todayStr={todayStr}
                        />
                      ))}
                    </GroupBlock>
                  ))
              : projects.map((p) => {
                  const pr = projResources.get(p.id);
                  const rids = pr ? [...pr.keys()] : [];
                  return (
                    <GroupBlock key={p.id} title={p.name} colour={projectColour.get(p.id)} href={`/${slug}/project-schedule/${p.id}`}>
                      {rids.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-ink-muted">No one assigned.</div>
                      ) : (
                        rids
                          .map((rid) => resourceById.get(rid))
                          .filter(Boolean)
                          .sort((a, b) => a!.display_name.localeCompare(b!.display_name))
                          .map((r) => (
                            <Row
                              key={r!.id}
                              span={span}
                              name={r!.display_name}
                              sub={r!.kind === 'subcontractor'}
                              cells={dayStr.map((ds) =>
                                pr?.get(r!.id)?.has(ds)
                                  ? { pid: p.id, label: p.name, colour: projectColour.get(p.id) ?? '#64748b', href: `/${slug}/project-schedule/${p.id}` }
                                  : null,
                              )}
                              dayStr={dayStr}
                              todayStr={todayStr}
                            />
                          ))
                      )}
                    </GroupBlock>
                  );
                })}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted">
          {projects.map((p) => (
            <Link key={p.id} href={`/${slug}/project-schedule/${p.id}`} className="flex items-center gap-1.5 hover:text-ink">
              <span className="h-3 w-3 rounded-sm" style={{ background: projectColour.get(p.id) }} />
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupBlock({ title, colour, href, children }: { title: string; colour?: string; href?: string; children: React.ReactNode }) {
  const head = (
    <div className="flex items-center gap-2 bg-canvas/60 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
      {colour && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colour }} />}
      {title}
    </div>
  );
  return (
    <div>
      {href ? <Link href={href}>{head}</Link> : head}
      {children}
    </div>
  );
}

function Row({
  span,
  name,
  sub,
  cells,
  dayStr,
  todayStr,
}: {
  span: number;
  name: string;
  sub: boolean;
  cells: ({ pid: string; label: string; colour: string; href: string } | null)[];
  dayStr: string[];
  todayStr: string;
}) {
  return (
    <div className="grid items-center border-b border-hairline last:border-b-0 hover:bg-canvas/30" style={{ gridTemplateColumns: `200px repeat(${span}, 1fr)` }}>
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{initials(name) || '?'}</span>
        <span className="min-w-0 truncate text-sm font-semibold">
          {name}
          {sub && <span className="ml-1 text-[10px] font-bold text-accent-deep">SUB</span>}
        </span>
      </div>
      {cells.map((c, i) => {
        const isToday = dayStr[i] === todayStr;
        return (
          <div key={dayStr[i]} className={`h-full border-l border-hairline px-1 py-1.5 ${isToday ? 'bg-primary-soft/40' : ''}`}>
            {c && (
              <Link href={c.href} className="block truncate rounded-md px-1.5 py-1 text-[10px] font-bold text-white" style={{ background: c.colour }} title={c.label}>
                {c.label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border border-dashed border-hairline bg-white/60 p-8 text-center text-sm text-ink-muted">{children}</div>;
}
