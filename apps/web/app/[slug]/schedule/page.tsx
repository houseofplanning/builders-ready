import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { ResourceKind } from '@br/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: 'Schedule · Builders Ready' };

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);
const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

const PALETTE = ['#0F4C5C', '#E07A5F', '#2F6DB5', '#3B8C6E', '#7A5AA6', '#B26A00', '#9A4B35'];

export default async function SchedulePage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/dashboard`);

  // Current week (Mon–Sun), in UTC to match how bookings are stored (08:00Z).
  const now = new Date();
  const diffToMon = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMon));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
  const dayStr = days.map((d) => d.toISOString().slice(0, 10));
  const todayStr = now.toISOString().slice(0, 10);
  const weekStart = dayStr[0]!;
  const weekEndExcl = new Date(monday);
  weekEndExcl.setUTCDate(monday.getUTCDate() + 7);
  const weekEndStr = weekEndExcl.toISOString().slice(0, 10);

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
      .in('status', ['active', 'on_hold']),
    supabase
      .from('assignments')
      .select('resource_id, project_id, starts_at, cost_pence')
      .eq('tenant_id', tenant.id)
      .gte('starts_at', `${weekStart}T00:00:00Z`)
      .lt('starts_at', `${weekEndStr}T00:00:00Z`),
  ]);

  const resources = (resourceRows ?? []) as { id: string; display_name: string; kind: ResourceKind; trade: string | null }[];
  const projects = (projectRows ?? []) as { id: string; name: string; status: string }[];
  const projectColour = new Map(projects.map((p, i) => [p.id, PALETTE[i % PALETTE.length]!]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  // booking lookup: resource_id -> date -> {project_id}
  const cell = new Map<string, Map<string, string>>();
  const peopleBooked = new Set<string>();
  let weekCost = 0;
  for (const a of assignmentRows ?? []) {
    const rid = a.resource_id as string;
    const date = (a.starts_at as string).slice(0, 10);
    const inner = cell.get(rid) ?? new Map<string, string>();
    if (!inner.has(date)) inner.set(date, a.project_id as string);
    cell.set(rid, inner);
    peopleBooked.add(rid);
    weekCost += a.cost_pence != null ? Number(a.cost_pence) : 0;
  }

  // group resources by trade
  const byTrade = new Map<string, typeof resources>();
  for (const r of resources) {
    const key = r.trade || 'General / labour';
    const list = byTrade.get(key) ?? [];
    list.push(r);
    byTrade.set(key, list);
  }
  const tradeGroups = [...byTrade.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // cover by trade
  const cover = tradeGroups.map(([trade, list]) => {
    const booked = list.filter((r) => peopleBooked.has(r.id)).length;
    return { trade, total: list.length, booked, free: list.length - booked };
  });

  const monthLabel = days[0]!.toLocaleDateString('en-GB', { month: 'short' });
  const weekLabel = `${days[0]!.getUTCDate()}–${days[6]!.getUTCDate()} ${monthLabel}`;

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Where your team and subbies are this week ({weekLabel}). Read-only for now; drag-to-assign
          and multi-week come with the timeline grid. Open a project to assign people.
        </p>
      </header>

      {/* KPI band */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="People scheduled" value={`${peopleBooked.size} of ${resources.length}`} />
        <Tile label="Scheduled cost · this week" value={money(weekCost)} />
        <Tile label="Projects running" value={String(projects.length)} />
      </div>

      {/* cover by trade */}
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

      {/* timeline */}
      {resources.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-white/60 p-8 text-center text-sm text-ink-muted">
          No team yet. Add crew and subbies on <span className="font-semibold">Team &amp; rates</span>, then assign them on a project.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline bg-white shadow-card">
          <div className="min-w-[760px]">
            {/* header row */}
            <div className="grid border-b border-hairline bg-canvas/50" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
              <div className="px-4 py-2 text-xs font-bold text-ink-muted">Team member</div>
              {days.map((d, i) => {
                const ds = dayStr[i]!;
                const isToday = ds === todayStr;
                return (
                  <div key={ds} className={`border-l border-hairline px-1 py-2 text-center text-[11px] ${isToday ? 'bg-primary-soft' : ''}`}>
                    <div className="text-ink-muted">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                    <div className={`font-bold ${isToday ? 'text-primary' : 'text-ink'}`}>{d.getUTCDate()}</div>
                  </div>
                );
              })}
            </div>

            {tradeGroups.map(([trade, list]) => (
              <div key={trade}>
                <div className="bg-canvas/60 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
                  {trade}
                </div>
                {list.map((r) => (
                  <div key={r.id} className="grid items-center border-b border-hairline last:border-b-0 hover:bg-canvas/30" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                        {initials(r.display_name) || '?'}
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold">
                        {r.display_name}
                        {r.kind === 'subcontractor' && <span className="ml-1 text-[10px] font-bold text-accent-deep">SUB</span>}
                      </span>
                    </div>
                    {dayStr.map((ds) => {
                      const pid = cell.get(r.id)?.get(ds);
                      const isToday = ds === todayStr;
                      return (
                        <div key={ds} className={`h-full border-l border-hairline px-1 py-1.5 ${isToday ? 'bg-primary-soft/40' : ''}`}>
                          {pid && (
                            <Link
                              href={`/${slug}/schedule/${pid}`}
                              className="block truncate rounded-md px-1.5 py-1 text-[10px] font-bold text-white"
                              style={{ background: projectColour.get(pid) ?? '#64748b' }}
                              title={projectName.get(pid) ?? ''}
                            >
                              {projectName.get(pid) ?? 'Job'}
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* legend */}
      {projects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted">
          {projects.map((p) => (
            <Link key={p.id} href={`/${slug}/schedule/${p.id}`} className="flex items-center gap-1.5 hover:text-ink">
              <span className="h-3 w-3 rounded-sm" style={{ background: projectColour.get(p.id) }} />
              {p.name}
            </Link>
          ))}
        </div>
      )}
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
