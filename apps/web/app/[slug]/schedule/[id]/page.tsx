import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@br/shared';
import type { ResourceKind, RateUnit, CostCategory } from '@br/shared';
import { ProjectStatusPill } from '@/components/status-pill';
import {
  WhosOnJob,
  type AssignableResource,
  type BookingRow,
} from '@/components/scheduling/project-schedule-panel';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export const metadata = { title: 'Project schedule · Builders Ready' };

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);

export default async function ProjectSchedulePage({ params }: Props) {
  const { slug, id } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/schedule`);

  const supabase = await createSupabaseServer();
  const [
    { data: project },
    { data: stages },
    { data: finance },
    { data: costRows },
    { data: estCost },
    { data: resourceRows },
    { data: assignmentRows },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:profiles!projects_client_id_fkey(full_name)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('project_stages')
      .select('id, name, position, status, start_date, target_end_date')
      .eq('project_id', id)
      .order('position'),
    supabase
      .from('project_finance')
      .select('variations_pence, invoiced_pence, paid_pence, open_decisions')
      .eq('project_id', id)
      .maybeSingle(),
    supabase.from('project_costs').select('category, amount_pence').eq('project_id', id),
    supabase
      .from('estimates')
      .select('cost_subtotal_pence')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('resources')
      .select('id, display_name, kind, trade, cost_rate_pence, cost_rate_unit')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('display_name'),
    supabase
      .from('assignments')
      .select('resource_id, starts_at, ends_at, cost_pence, resource:resources(display_name, kind, trade)')
      .eq('project_id', id),
  ]);

  if (!project) notFound();

  const resources: AssignableResource[] = (resourceRows ?? []).map((r) => ({
    id: r.id as string,
    display_name: r.display_name as string,
    kind: r.kind as ResourceKind,
    trade: (r.trade as string | null) ?? null,
    cost_rate_pence: r.cost_rate_pence != null ? Number(r.cost_rate_pence) : null,
    cost_rate_unit: r.cost_rate_unit as RateUnit,
  }));

  const bookings: BookingRow[] = (assignmentRows ?? []).map((a) => {
    const res = Array.isArray(a.resource) ? a.resource[0] : a.resource;
    return {
      resource_id: a.resource_id as string,
      resource_name: (res?.display_name as string) ?? 'Someone',
      kind: (res?.kind as ResourceKind) ?? 'operative',
      trade: (res?.trade as string | null) ?? null,
      start: a.starts_at as string,
      end: a.ends_at as string,
      cost_pence: a.cost_pence != null ? Number(a.cost_pence) : 0,
    };
  });

  // ---- money -------------------------------------------------------------
  const contractValue = Number(project.quoted_amount_pence ?? 0) + Number(finance?.variations_pence ?? 0);

  const loggedByCat: Record<CostCategory, number> = {
    materials: 0,
    labour: 0,
    plant_hire: 0,
    subcontractor: 0,
    other: 0,
  };
  for (const c of costRows ?? []) {
    const cat = (c.category as CostCategory) in loggedByCat ? (c.category as CostCategory) : 'other';
    loggedByCat[cat] += Number(c.amount_pence);
  }
  const loggedTotal = Object.values(loggedByCat).reduce((a, b) => a + b, 0);

  let schedLabour = 0;
  let schedSub = 0;
  for (const b of bookings) {
    if (b.kind === 'subcontractor') schedSub += b.cost_pence;
    else schedLabour += b.cost_pence;
  }
  const scheduledTotal = schedLabour + schedSub;

  const breakdown = [
    { label: 'Materials', value: loggedByCat.materials, colour: 'var(--br-primary)' },
    { label: 'Labour (crew)', value: loggedByCat.labour + schedLabour, colour: '#2F6DB5' },
    { label: 'Subcontractor', value: loggedByCat.subcontractor + schedSub, colour: 'var(--br-accent)' },
    { label: 'Plant / hire', value: loggedByCat.plant_hire, colour: '#7A5AA6' },
    { label: 'Other', value: loggedByCat.other, colour: '#8A979C' },
  ].filter((b) => b.value > 0);
  const costToDate = loggedTotal + scheduledTotal;
  const maxBar = Math.max(costToDate, 1);

  const margin = contractValue > 0 ? ((contractValue - costToDate) / contractValue) * 100 : null;
  const budgeted = estCost?.cost_subtotal_pence != null ? Number(estCost.cost_subtotal_pence) : null;
  const quotedMargin = budgeted != null && contractValue > 0 ? ((contractValue - budgeted) / contractValue) * 100 : null;

  const invoiced = Number(finance?.invoiced_pence ?? 0);
  const paid = Number(finance?.paid_pence ?? 0);
  const outstanding = Math.max(0, invoiced - paid);
  const openDecisions = Number(finance?.open_decisions ?? 0);

  // ---- stage + health ----------------------------------------------------
  const stageList = (stages ?? []) as {
    id: string;
    name: string;
    position: number;
    status: string;
    start_date: string | null;
    target_end_date: string | null;
  }[];
  const doneCount = stageList.filter((s) => s.status === 'complete').length;
  const currentStage = stageList.find((s) => s.id === project.current_stage_id) ?? stageList.find((s) => s.status === 'in_progress');
  const nextStage = stageList.find((s) => s.position > (currentStage?.position ?? -1) && s.status !== 'complete');

  const dueDate = project.actual_end_date ?? project.estimated_end_date;
  const pastDue = project.status !== 'completed' && dueDate && new Date(dueDate) < new Date();
  const onTrack = (margin == null || margin >= 0) && !pastDue;
  const healthReasons: string[] = [];
  if (margin != null) {
    healthReasons.push(
      quotedMargin != null
        ? `Margin ${margin.toFixed(0)}% vs ${quotedMargin.toFixed(0)}% quoted.`
        : `Margin ${margin.toFixed(0)}%.`,
    );
  }
  healthReasons.push(pastDue ? 'Past the due date.' : 'Dates holding.');
  if (openDecisions > 0) healthReasons.push(`${openDecisions} decision${openDecisions === 1 ? '' : 's'} open.`);

  return (
    <div>
      <Link href={`/${slug}/schedule`} className="mb-3 inline-block text-xs text-ink-muted hover:text-ink">
        ← Schedule
      </Link>

      {/* header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{project.name}</h1>
            <ProjectStatusPill status={project.status} />
          </div>
          <p className="text-sm text-ink-muted">
            {project.address_line1}
            {project.address_line2 ? `, ${project.address_line2}` : ''}, {project.city} {project.postcode}
            {(() => {
              const c = Array.isArray(project.client) ? project.client[0] : project.client;
              return c?.full_name ? ` · Client: ${c.full_name}` : '';
            })()}
          </p>
        </div>
        <Link href={`/${slug}/projects/${project.id}`} className="flex-none text-xs font-semibold text-primary hover:underline">
          Open job admin →
        </Link>
      </div>

      {/* stage bar */}
      {stageList.length > 0 && (
        <div className="mt-4 flex items-center gap-3 text-xs text-ink-muted">
          <span className="flex-none">
            Stage {Math.min(doneCount + 1, stageList.length)} of {stageList.length}
            {currentStage ? ' · ' : ''}
            {currentStage && <span className="font-bold text-ink">{currentStage.name}</span>}
          </span>
          <div className="flex flex-1 gap-1.5">
            {stageList.map((s) => (
              <div
                key={s.id}
                className={`h-2 flex-1 rounded-full ${
                  s.status === 'complete' ? 'bg-primary' : s.id === currentStage?.id ? 'bg-accent' : 'bg-canvas'
                }`}
              />
            ))}
          </div>
          <span className="flex-none">
            {onTrack ? 'on track' : 'at risk'} · est. complete {formatDate(dueDate)}
          </span>
        </div>
      )}

      {/* KPI tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Contract value" value={money(contractValue)} hint="quote + signed variations" />
        <Tile label="Cost to date" value={money(costToDate)} hint={`${money(loggedTotal)} logged · ${money(scheduledTotal)} scheduled`} />
        <Tile label="Live margin" value={margin == null ? '—' : `${margin.toFixed(1)}%`} hint={margin == null ? 'team only' : `${money(contractValue - costToDate)} · team only`} good={margin != null && margin >= 0} />
        <Tile label="Invoiced" value={money(invoiced)} hint={`${money(paid)} paid · ${money(outstanding)} to collect`} />
      </div>

      {/* two columns */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <WhosOnJob projectId={project.id} canWrite resources={resources} stages={stageList.map((s) => ({ id: s.id, name: s.name }))} bookings={bookings} />

        <div className="space-y-4">
          {/* cost to business */}
          <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">Cost to business</h2>
              <span className="text-xs font-bold">{money(costToDate)}</span>
            </div>
            {breakdown.length === 0 ? (
              <p className="text-sm text-ink-muted">No costs yet. Log costs or assign the team.</p>
            ) : (
              <div className="space-y-3">
                {breakdown.map((b) => (
                  <div key={b.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{b.label}</span>
                      <span className="font-bold">{money(b.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full" style={{ width: `${(b.value / maxBar) * 100}%`, background: b.colour }} />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-hairline pt-3 text-sm font-extrabold">
                  <span>Total</span>
                  <span>{money(costToDate)}</span>
                </div>
              </div>
            )}
          </section>

          {/* project health */}
          <section className="rounded-card border border-hairline bg-white p-5 shadow-card">
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-ink-muted">Project health</h2>
            <div className={`flex items-start gap-3 rounded-xl border p-3 ${onTrack ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <span className={`grid h-6 w-6 flex-none place-items-center rounded-full text-sm font-extrabold text-white ${onTrack ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                {onTrack ? '✓' : '!'}
              </span>
              <div>
                <div className={`font-bold ${onTrack ? 'text-emerald-800' : 'text-amber-800'}`}>{onTrack ? 'On track' : 'Needs attention'}</div>
                <div className={`mt-0.5 text-xs ${onTrack ? 'text-emerald-900/80' : 'text-amber-900/80'}`}>{healthReasons.join(' ')}</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* resourcing ahead */}
      <section className="mt-4 rounded-card border border-hairline bg-white p-5 shadow-card">
        <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-ink-muted">Resourcing ahead</h2>
        {nextStage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <div className="font-extrabold text-amber-900">
              Next stage · {nextStage.name}
              {nextStage.start_date ? ` starts ${formatDate(nextStage.start_date)}` : ''}
            </div>
            <div className="mt-1 text-amber-900/80">
              The cover check (which trades it needs and who&apos;s free in time) arrives with team availability.
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Final stage in progress. Nothing queued after this.</p>
        )}
      </section>

      <p className="mt-4 text-center text-[11px] text-ink-muted">
        Scheduled labour and subbie cost is included in the figures above, from the rates on Team &amp; rates.
      </p>
    </div>
  );
}

function Tile({ label, value, hint, good }: { label: string; value: string; hint?: string; good?: boolean }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tracking-tight ${good ? 'text-emerald-600' : 'text-ink'}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-ink-muted">{hint}</div>}
    </div>
  );
}
