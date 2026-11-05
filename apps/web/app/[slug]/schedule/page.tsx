import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import type { ResourceKind } from '@br/shared';
import { isPlant } from '@br/shared';
import { ScheduleGrid, type GridGroup, type DayCol, type GridCell } from '@/components/scheduling/schedule-grid';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ span?: string; group?: string; start?: string }>;
}

export const metadata = { title: 'Schedule · Builders Ready' };

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);
const PALETTE = ['#0F4C5C', '#E07A5F', '#2F6DB5', '#3B8C6E', '#7A5AA6', '#B26A00', '#9A4B35'];
const SPANS = [
  { v: 7, label: 'Week' },
  { v: 10, label: '10 days' },
  { v: 14, label: '2 weeks' },
  { v: 28, label: 'Month' },
];
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export default async function SchedulePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const span = SPANS.some((s) => s.v === Number(sp.span)) ? Number(sp.span) : 7;
  const group: 'people' | 'projects' = sp.group === 'projects' ? 'projects' : 'people';
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/dashboard`);

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = sp.start && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? new Date(`${sp.start}T00:00:00Z`) : todayUtc;
  const days = Array.from({ length: span }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
  const dayStr = days.map(isoDay);
  const todayStr = isoDay(todayUtc);
  const endExcl = new Date(start);
  endExcl.setUTCDate(start.getUTCDate() + span);

  const prevStart = new Date(start);
  prevStart.setUTCDate(start.getUTCDate() - span);
  const nextStart = new Date(start);
  nextStart.setUTCDate(start.getUTCDate() + span);
  const qs = (startIso: string, spanV = span, grp = group) => `/${slug}/schedule?start=${startIso}&span=${spanV}&group=${grp}`;

  const supabase = await createSupabaseServer();
  const [{ data: resourceRows }, { data: projectRows }, { data: assignmentRows }] = await Promise.all([
    supabase.from('resources').select('id, display_name, kind, trade').eq('tenant_id', tenant.id).eq('active', true).order('display_name'),
    supabase
      .from('projects')
      .select('id, name, status, client:profiles!projects_client_id_fkey(full_name)')
      .eq('tenant_id', tenant.id)
      .in('status', ['active', 'on_hold'])
      .order('name'),
    supabase
      .from('assignments')
      .select('resource_id, project_id, starts_at, cost_pence')
      .eq('tenant_id', tenant.id)
      .gte('starts_at', `${dayStr[0]}T00:00:00Z`)
      .lt('starts_at', `${isoDay(endExcl)}T00:00:00Z`),
  ]);

  const resources = (resourceRows ?? []) as { id: string; display_name: string; kind: ResourceKind; trade: string | null }[];
  const projects = (projectRows ?? []) as { id: string; name: string; status: string }[];
  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const projectColour = new Map(projects.map((p, i) => [p.id, PALETTE[i % PALETTE.length]!]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const projectClient = new Map<string, string>();
  for (const p of (projectRows ?? []) as {
    id: string;
    client?: { full_name: string } | { full_name: string }[] | null;
  }[]) {
    const c = Array.isArray(p.client) ? p.client[0] : p.client;
    if (c?.full_name) projectClient.set(p.id, c.full_name);
  }

  // rid -> date -> set of project ids (for clash detection); project->rid->dates
  const multi = new Map<string, Map<string, Set<string>>>();
  const projResources = new Map<string, Map<string, Set<string>>>();
  const peopleBooked = new Set<string>();
  const outByDay = new Map<string, number>();
  let horizonCost = 0;
  let clashCount = 0;
  for (const a of assignmentRows ?? []) {
    const rid = a.resource_id as string;
    const pid = a.project_id as string;
    const date = (a.starts_at as string).slice(0, 10);
    const inner = multi.get(rid) ?? multi.set(rid, new Map()).get(rid)!;
    const set = inner.get(date) ?? inner.set(date, new Set()).get(date)!;
    if (set.size === 1 && !set.has(pid)) clashCount++; // this booking tips it into a clash
    set.add(pid);
    const pr = projResources.get(pid) ?? projResources.set(pid, new Map()).get(pid)!;
    (pr.get(rid) ?? pr.set(rid, new Set()).get(rid)!).add(date);
    if (!isPlant(resourceById.get(rid)?.kind ?? 'operative')) peopleBooked.add(rid);
    const c = a.cost_pence != null ? Number(a.cost_pence) : 0;
    horizonCost += c;
    outByDay.set(date, (outByDay.get(date) ?? 0) + c);
  }

  // Cashflow: scheduled cost out (above) + stage-payment invoices due in the window.
  const activeIds = projects.map((p) => p.id);
  const { data: invoiceRows } = activeIds.length
    ? await supabase
        .from('invoices')
        .select('project_id, amount_gbp_pence, due_at, status')
        .in('project_id', activeIds)
        .neq('status', 'paid')
        .gte('due_at', `${dayStr[0]}T00:00:00Z`)
        .lt('due_at', `${isoDay(endExcl)}T00:00:00Z`)
    : { data: [] as { project_id: string; amount_gbp_pence: number; due_at: string | null; status: string }[] };
  const inByDay = new Map<string, { label: string; colour: string; amountPence: number }[]>();
  let totalIn = 0;
  for (const inv of invoiceRows ?? []) {
    const due = (inv.due_at as string | null)?.slice(0, 10);
    if (!due) continue;
    const pid = inv.project_id as string;
    const amt = Number(inv.amount_gbp_pence ?? 0);
    (inByDay.get(due) ?? inByDay.set(due, []).get(due)!).push({
      label: projectName.get(pid) ?? 'Invoice',
      colour: projectColour.get(pid) ?? '#64748b',
      amountPence: amt,
    });
    totalIn += amt;
  }

  const people = resources.filter((r) => !isPlant(r.kind));
  const plant = resources.filter((r) => isPlant(r.kind));

  const byTrade = new Map<string, typeof people>();
  for (const r of people) {
    const key = r.trade || 'General / labour';
    (byTrade.get(key) ?? byTrade.set(key, []).get(key)!).push(r);
  }
  const cover = [...byTrade.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([trade, list]) => {
      const booked = list.filter((r) => peopleBooked.has(r.id)).length;
      return { trade, total: list.length, booked, free: list.length - booked };
    });

  const dayCols: DayCol[] = days.map((d, i) => ({
    iso: dayStr[i]!,
    weekday: d.toLocaleDateString('en-GB', { weekday: 'narrow' }),
    date: d.getUTCDate(),
    isToday: dayStr[i] === todayStr,
    weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
  }));

  const badgeFor = (k: ResourceKind): 'SUB' | 'PLANT' | null => (k === 'subcontractor' ? 'SUB' : isPlant(k) ? 'PLANT' : null);
  const cellPeople = (rid: string, date: string): GridCell | null => {
    const set = multi.get(rid)?.get(date);
    if (!set || set.size === 0) return null;
    const pid = [...set][0]!;
    return { pid, label: projectName.get(pid) ?? 'Job', colour: projectColour.get(pid) ?? '#64748b', clash: set.size > 1 };
  };
  const cellProject = (rid: string, date: string, pid: string): GridCell | null => {
    if (!projResources.get(pid)?.get(rid)?.has(date)) return null;
    const set = multi.get(rid)?.get(date);
    return { pid, label: projectName.get(pid) ?? 'Job', colour: projectColour.get(pid) ?? '#64748b', clash: (set?.size ?? 0) > 1 };
  };

  const groups: GridGroup[] =
    group === 'people'
      ? [
          ...[...byTrade.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([trade, list]) => ({
              title: trade,
              rows: list.map((r) => ({ resourceId: r.id, name: r.display_name, badge: badgeFor(r.kind), cells: dayStr.map((ds) => cellPeople(r.id, ds)) })),
            })),
          ...(plant.length > 0
            ? [{ title: 'Plant & equipment', rows: plant.map((r) => ({ resourceId: r.id, name: r.display_name, badge: 'PLANT' as const, cells: dayStr.map((ds) => cellPeople(r.id, ds)) })) }]
            : []),
        ]
      : projects.map((p) => {
          const rids = projResources.get(p.id) ? [...projResources.get(p.id)!.keys()] : [];
          return {
            title: p.name,
            subtitle: projectClient.get(p.id) ? `Client: ${projectClient.get(p.id)}` : undefined,
            colour: projectColour.get(p.id),
            href: `/${slug}/project-schedule/${p.id}`,
            rows: rids
              .map((rid) => resourceById.get(rid))
              .filter((r): r is NonNullable<typeof r> => !!r)
              .sort((a, b) => a.display_name.localeCompare(b.display_name))
              .map((r) => ({ resourceId: r.id, name: r.display_name, badge: badgeFor(r.kind), cells: dayStr.map((ds) => cellProject(r.id, ds, p.id)) })),
          };
        });

  const projectOpts = projects.map((p) => ({ id: p.id, name: p.name, colour: projectColour.get(p.id) ?? '#64748b' }));
  const rangeLabel = `${days[0]!.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${days[span - 1]!.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
  const cashflow = dayStr.map((ds) => ({ outPence: outByDay.get(ds) ?? 0, in: inByDay.get(ds) ?? [] }));
  const net = totalIn - horizonCost;

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
          <p className="mt-1 text-sm text-ink-muted">Where your team, subbies and plant are. Click a day to assign. Clashes are flagged in red.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-hairline">
            <Link href={qs(isoDay(prevStart))} className="px-2.5 py-1.5 text-xs font-bold text-ink-muted hover:text-ink" aria-label="Previous">‹</Link>
            <Link href={qs(todayStr)} className="border-x border-hairline px-3 py-1.5 text-xs font-bold text-ink-muted hover:text-ink">Today</Link>
            <Link href={qs(isoDay(nextStart))} className="px-2.5 py-1.5 text-xs font-bold text-ink-muted hover:text-ink" aria-label="Next">›</Link>
          </div>
          <span className="text-xs font-semibold text-ink-muted">{rangeLabel}</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-hairline">
            <Seg active={group === 'people'} href={qs(dayStr[0]!, span, 'people')}>People</Seg>
            <Seg active={group === 'projects'} href={qs(dayStr[0]!, span, 'projects')}>Projects</Seg>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-hairline">
            {SPANS.map((s) => (
              <Seg key={s.v} active={span === s.v} href={qs(dayStr[0]!, s.v)}>{s.label}</Seg>
            ))}
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="People scheduled" value={`${peopleBooked.size} of ${people.length}`} />
        <Tile label="Scheduled cost" value={money(horizonCost)} />
        <Tile label="Projects running" value={String(projects.length)} />
        <Tile label="Clashes" value={String(clashCount)} alert={clashCount > 0} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-card border border-hairline bg-white px-4 py-3 text-sm shadow-card">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Cashflow · {rangeLabel}</span>
        <span>Out <b className="text-red-600">{money(horizonCost)}</b></span>
        <span>In <b className="text-emerald-600">{money(totalIn)}</b></span>
        <span>Net <b className={net >= 0 ? 'text-emerald-600' : 'text-red-600'}>{money(net)}</b></span>
        <span className="text-[11px] text-ink-muted">scheduled cost out · agreed stage payments due in</span>
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
          No team or plant yet. Add crew, subbies and plant on <span className="font-semibold">Team &amp; rates</span>, then click a day to assign them.
        </div>
      ) : (
        <ScheduleGrid slug={slug} span={span} days={dayCols} groups={groups} projects={projectOpts} canWrite cashflow={cashflow} />
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

function Tile({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-card border p-4 shadow-card ${alert ? 'border-red-200 bg-red-50' : 'border-hairline bg-white'}`}>
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className={`mt-1 text-xl font-extrabold tracking-tight ${alert ? 'text-red-700' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
