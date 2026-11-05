import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { ResourceKind } from '@br/shared';
import { ScheduleGrid, type GridGroup, type DayCol } from '@/components/scheduling/schedule-grid';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; group?: string }>;
}

export const metadata = { title: 'Schedule · Builders Ready' };

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);

const PALETTE = ['#0F4C5C', '#E07A5F', '#2F6DB5', '#3B8C6E', '#7A5AA6', '#B26A00', '#9A4B35'];

export default async function SchedulePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const view: 'week' | 'month' = sp.view === 'month' ? 'month' : 'week';
  const group: 'people' | 'projects' = sp.group === 'projects' ? 'projects' : 'people';
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/dashboard`);

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
    supabase.from('resources').select('id, display_name, kind, trade').eq('tenant_id', tenant.id).eq('active', true).order('display_name'),
    supabase.from('projects').select('id, name, status').eq('tenant_id', tenant.id).in('status', ['active', 'on_hold']).order('name'),
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

  const peopleCell = new Map<string, Map<string, string>>();
  const projResources = new Map<string, Map<string, Set<string>>>();
  const peopleBooked = new Set<string>();
  let horizonCost = 0;
  for (const a of assignmentRows ?? []) {
    const rid = a.resource_id as string;
    const pid = a.project_id as string;
    const date = (a.starts_at as string).slice(0, 10);
    (peopleCell.get(rid) ?? peopleCell.set(rid, new Map()).get(rid)!).set(date, (peopleCell.get(rid)!.get(date) ?? pid));
    const pr = projResources.get(pid) ?? new Map<string, Set<string>>();
    (pr.get(rid) ?? pr.set(rid, new Set()).get(rid)!).add(date);
    projResources.set(pid, pr);
    peopleBooked.add(rid);
    horizonCost += a.cost_pence != null ? Number(a.cost_pence) : 0;
  }

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

  // ---- serializable data for the interactive grid ----
  const dayCols: DayCol[] = days.map((d, i) => ({
    iso: dayStr[i]!,
    weekday: d.toLocaleDateString('en-GB', { weekday: 'narrow' }),
    date: d.getUTCDate(),
    isToday: dayStr[i] === todayStr,
    weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
  }));

  const cellFor = (pid: string | undefined) =>
    pid ? { pid, label: projectName.get(pid) ?? 'Job', colour: projectColour.get(pid) ?? '#64748b' } : null;

  const groups: GridGroup[] =
    group === 'people'
      ? [...byTrade.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([trade, list]) => ({
            title: trade,
            rows: list.map((r) => ({
              resourceId: r.id,
              name: r.display_name,
              sub: r.kind === 'subcontractor',
              cells: dayStr.map((ds) => cellFor(peopleCell.get(r.id)?.get(ds))),
            })),
          }))
      : projects.map((p) => {
          const pr = projResources.get(p.id);
          const rids = pr ? [...pr.keys()] : [];
          return {
            title: p.name,
            colour: projectColour.get(p.id),
            href: `/${slug}/project-schedule/${p.id}`,
            rows: rids
              .map((rid) => resourceById.get(rid))
              .filter((r): r is NonNullable<typeof r> => !!r)
              .sort((a, b) => a.display_name.localeCompare(b.display_name))
              .map((r) => ({
                resourceId: r.id,
                name: r.display_name,
                sub: r.kind === 'subcontractor',
                cells: dayStr.map((ds) =>
                  pr?.get(r.id)?.has(ds) ? { pid: p.id, label: p.name, colour: projectColour.get(p.id) ?? '#64748b' } : null,
                ),
              })),
          };
        });

  const projectOpts = projects.map((p) => ({ id: p.id, name: p.name, colour: projectColour.get(p.id) ?? '#64748b' }));
  const label = view === 'month' ? 'next 4 weeks' : 'this week';

  const Seg = ({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) => (
    <Link href={href} className={`px-3 py-1.5 text-xs font-bold ${active ? 'bg-primary text-white' : 'bg-white text-ink-muted hover:text-ink'}`}>
      {children}
    </Link>
  );

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-ink-muted">Where your team and subbies are, {label}. Click a day to assign someone.</p>
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
        <div className="rounded-card border border-dashed border-hairline bg-white/60 p-8 text-center text-sm text-ink-muted">
          No team yet. Add crew and subbies on <span className="font-semibold">Team &amp; rates</span>, then click a day to assign them.
        </div>
      ) : (
        <ScheduleGrid slug={slug} span={span} days={dayCols} groups={groups} projects={projectOpts} canWrite />
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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
