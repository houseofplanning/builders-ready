import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@br/shared';
import type { ResourceKind, RateUnit } from '@br/shared';
import { ProjectStatusPill } from '@/components/status-pill';
import {
  ProjectSchedulePanel,
  type AssignableResource,
  type BookingRow,
} from '@/components/scheduling/project-schedule-panel';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export const metadata = { title: 'Project schedule · Builders Ready' };

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
    { data: resourceRows },
    { data: assignmentRows },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).maybeSingle(),
    supabase.from('project_stages').select('id, name, position, status').eq('project_id', id).order('position'),
    supabase.from('project_finance').select('variations_pence').eq('project_id', id).maybeSingle(),
    supabase.from('project_costs').select('amount_pence').eq('project_id', id),
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

  const contractValue = Number(project.quoted_amount_pence ?? 0) + Number(finance?.variations_pence ?? 0);
  const loggedCost = (costRows ?? []).reduce((n, c) => n + Number(c.amount_pence), 0);

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

  const stageList = (stages ?? []) as { id: string; name: string; position: number; status: string }[];
  const doneCount = stageList.filter((s) => s.status === 'complete').length;
  const currentStage = stageList.find((s) => s.id === project.current_stage_id) ?? stageList.find((s) => s.status === 'in_progress');

  return (
    <div>
      <Link href={`/${slug}/schedule`} className="mb-3 inline-block text-xs text-ink-muted hover:text-ink">
        ← Schedule
      </Link>

      <section className="mb-4 rounded-card border border-hairline bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">{project.name}</h1>
              <ProjectStatusPill status={project.status} />
            </div>
            <p className="text-sm text-ink-muted">
              {project.address_line1}
              {project.address_line2 ? `, ${project.address_line2}` : ''}, {project.city} · {project.postcode}
            </p>
          </div>
          <Link
            href={`/${slug}/projects/${project.id}`}
            className="flex-none text-xs font-semibold text-primary hover:underline"
          >
            Open job admin →
          </Link>
        </div>

        {stageList.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
              <span>
                Stage {Math.min(doneCount + 1, stageList.length)} of {stageList.length}
                {currentStage ? ` · ` : ''}
                {currentStage && <span className="font-semibold text-ink">{currentStage.name}</span>}
              </span>
              <span>Due {formatDate(project.actual_end_date ?? project.estimated_end_date)}</span>
            </div>
            <div className="flex gap-1.5">
              {stageList.map((s) => (
                <div
                  key={s.id}
                  className={`h-2 flex-1 rounded-full ${
                    s.status === 'complete'
                      ? 'bg-primary'
                      : s.id === currentStage?.id
                        ? 'bg-accent'
                        : 'bg-canvas'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <ProjectSchedulePanel
        projectId={project.id}
        canWrite
        resources={resources}
        stages={stageList.map((s) => ({ id: s.id, name: s.name }))}
        bookings={bookings}
        loggedCostPence={loggedCost}
        contractValuePence={contractValue}
      />

      <p className="mt-4 text-center text-[11px] text-ink-muted">
        Scheduled labour and subbie cost is included in the margin above, from the rates on Team &amp; rates.
      </p>
    </div>
  );
}
