import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { ProjectStatusPill } from '@/components/status-pill';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: 'Project schedules · Builders Ready' };

const money = (p: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p / 100);

export default async function ProjectScheduleListPage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') redirect(`/${slug}/dashboard`);

  const supabase = await createSupabaseServer();
  const [{ data: projects }, { data: assignments }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, progress_percent, client:profiles!projects_client_id_fkey(full_name)')
      .eq('tenant_id', tenant.id)
      .in('status', ['active', 'on_hold'])
      .order('name'),
    supabase.from('assignments').select('project_id, resource_id, cost_pence').eq('tenant_id', tenant.id),
  ]);

  const byProject = new Map<string, { people: Set<string>; cost: number }>();
  for (const a of assignments ?? []) {
    const pid = a.project_id as string;
    const entry = byProject.get(pid) ?? { people: new Set<string>(), cost: 0 };
    entry.people.add(a.resource_id as string);
    entry.cost += a.cost_pence != null ? Number(a.cost_pence) : 0;
    byProject.set(pid, entry);
  }

  const list = projects ?? [];

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Project schedules</h1>
        <p className="mt-1 text-sm text-ink-muted">Pick a project to see its schedule, who&apos;s on it, and its cost and margin.</p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-white/60 p-8 text-center text-sm text-ink-muted">
          No active projects yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const info = byProject.get(p.id);
            const headcount = info?.people.size ?? 0;
            return (
              <Link
                key={p.id}
                href={`/${slug}/project-schedule/${p.id}`}
                className="flex flex-col rounded-card border border-hairline bg-white p-4 shadow-card transition hover:border-primary/40 hover:shadow-raised"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 truncate font-bold">{p.name}</h2>
                  <ProjectStatusPill status={p.status} />
                </div>
                {(() => {
                  const c = Array.isArray(p.client) ? p.client[0] : p.client;
                  return c?.full_name ? <div className="mt-0.5 text-xs text-ink-muted">Client: {c.full_name}</div> : null;
                })()}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress_percent}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">{headcount > 0 ? `${headcount} on site` : 'No one assigned'}</span>
                  <span className="font-bold text-ink">{money(info?.cost ?? 0)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
