import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@br/shared';
import { ProjectStatusPill, StagePill } from '@/components/status-pill';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectsListPage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  const supabase = await createSupabaseServer();

  const { data: projects } = await supabase
    .from('projects')
    .select(
      `id, name, address_line1, city, postcode, status, progress_percent,
       start_date, estimated_end_date,
       current_stage:project_stages!projects_current_stage_fk(id, name, status),
       client:profiles!projects_client_id_fkey(full_name),
       pm:profiles!projects_pm_id_fkey(full_name)`,
    )
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  const canCreate = role === 'owner' || role === 'pm';

  return (
    <div>
      <header className="mb-6 flex items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Tenant · {tenant.name}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Projects</h1>
        </div>
        {canCreate && (
          <Link
            href={`/${slug}/projects/new`}
            className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            + New project
          </Link>
        )}
      </header>

      {!projects || projects.length === 0 ? (
        <EmptyState canCreate={canCreate} slug={slug} />
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-white shadow-card">
          {projects.map((p, i) => {
            const current = Array.isArray(p.current_stage)
              ? p.current_stage[0]
              : (p.current_stage as { id: string; name: string; status: string } | null);
            const client = Array.isArray(p.client) ? p.client[0] : p.client;
            const pm = Array.isArray(p.pm) ? p.pm[0] : p.pm;
            return (
              <Link
                key={p.id}
                href={`/${slug}/projects/${p.id}`}
                className={`block ${i > 0 ? 'border-t border-hairline' : ''} p-5 transition hover:bg-canvas`}
              >
                <div className="grid grid-cols-[2fr_1fr_1.5fr_0.8fr] items-center gap-4">
                  <div>
                    <div className="text-sm font-bold text-ink">{p.name}</div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">
                      {p.address_line1}, {p.city} · {p.postcode}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">
                      Client: {client?.full_name ?? '—'} · PM: {pm?.full_name ?? '—'}
                    </div>
                  </div>
                  <div>
                    <ProjectStatusPill status={p.status} />
                    {current && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-muted">
                        <span>Stage {current.name}</span>
                        <StagePill status={current.status as never} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[10px] text-ink-muted">
                      <span>{p.progress_percent}%</span>
                      <span>Due {formatDate(p.estimated_end_date)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.progress_percent}%`,
                          background:
                            'linear-gradient(90deg, var(--br-primary), var(--br-accent))',
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-[12px] font-semibold text-primary">
                    Open →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  canCreate,
  slug,
}: {
  canCreate: boolean;
  slug: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-hairline bg-white p-14 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: '#E1F5EE' }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F6E56"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      </div>
      <h2 className="text-lg font-extrabold tracking-tight">
        {canCreate ? 'Start your first project' : 'No projects yet'}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
        {canCreate
          ? 'Create a project and your client gets a branded app to follow every milestone, decision and invoice.'
          : 'Your builder hasn’t set up a project for you yet — you’ll get a notification when they do.'}
      </p>
      {canCreate && (
        <Link
          href={`/${slug}/projects/new`}
          className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Create your first project
        </Link>
      )}
    </div>
  );
}
