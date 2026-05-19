import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate, gbp, relativeTime } from '@br/shared';
import { ProjectStatusPill } from '@/components/status-pill';
import { StageRow } from './stage-row';
import { UpdateComposer } from './update-composer';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ProjectDetail({ params }: Props) {
  const { slug, id } = await params;
  const { role } = await requireTenantBySlug(slug);
  const canWrite = role === 'owner' || role === 'pm';

  const supabase = await createSupabaseServer();

  const [{ data: project }, { data: stages }, { data: updates }, { data: finance }] =
    await Promise.all([
      supabase
        .from('projects')
        .select(
          `*,
           client:profiles!projects_client_id_fkey(id, full_name, email),
           pm:profiles!projects_pm_id_fkey(id, full_name, email)`,
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', id)
        .order('position'),
      supabase
        .from('project_updates')
        .select(
          `id, headline, body, decision_needed, posted_at, stage_id,
           posted_by_profile:profiles!project_updates_posted_by_fkey(id, full_name),
           stage:project_stages!project_updates_stage_id_fkey(id, name)`,
        )
        .eq('project_id', id)
        .order('posted_at', { ascending: false })
        .limit(50),
      supabase
        .from('project_finance')
        .select('*')
        .eq('project_id', id)
        .maybeSingle(),
    ]);

  if (!project) notFound();

  const client = Array.isArray(project.client) ? project.client[0] : project.client;
  const pm = Array.isArray(project.pm) ? project.pm[0] : project.pm;

  return (
    <div>
      <Link
        href={`/${slug}/projects`}
        className="mb-3 inline-block text-xs text-ink-muted hover:text-ink"
      >
        ← All projects
      </Link>

      {/* HEADER */}
      <section className="rounded-card border border-hairline bg-white p-6 shadow-card">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{project.name}</h1>
              <ProjectStatusPill status={project.status} />
            </div>
            <p className="text-sm text-ink-muted">
              {project.address_line1}
              {project.address_line2 ? `, ${project.address_line2}` : ''}, {project.city} ·{' '}
              {project.postcode}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Client: <span className="font-semibold text-ink">{client?.full_name ?? '—'}</span>
              {'  ·  '}
              PM: <span className="font-semibold text-ink">{pm?.full_name ?? '—'}</span>
            </p>
          </div>
          <div className="min-w-[180px] text-right">
            <div className="text-3xl font-extrabold tracking-tight">
              {project.progress_percent}%
            </div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              Progress
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${project.progress_percent}%`,
              background: 'linear-gradient(90deg, var(--br-primary), var(--br-accent))',
            }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
          <DateLabel label="Started" value={formatDate(project.start_date)} />
          <DateLabel
            label={project.actual_end_date ? 'Completed' : 'Due'}
            value={formatDate(project.actual_end_date ?? project.estimated_end_date)}
          />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              Open decisions
            </div>
            <div className="text-sm font-bold">{finance?.open_decisions ?? 0}</div>
          </div>
        </div>
      </section>

      {/* FINANCE */}
      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <FinanceCard label="Variations to date" value={gbp(Number(finance?.variations_pence ?? 0))} />
        <FinanceCard label="Invoiced" value={gbp(Number(finance?.invoiced_pence ?? 0))} />
        <FinanceCard
          label="Outstanding"
          value={gbp(
            Number(finance?.invoiced_pence ?? 0) - Number(finance?.paid_pence ?? 0),
          )}
        />
      </section>

      {/* TIMELINE */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
        <header className="flex items-center px-5 py-3">
          <h2 className="text-sm font-bold">Timeline</h2>
          <span className="ml-2 text-xs text-ink-muted">
            {stages?.length ?? 0} stages
          </span>
        </header>
        <ol>
          {stages?.map((s, idx) => (
            <StageRow
              key={s.id}
              stage={s}
              isLast={idx === (stages?.length ?? 0) - 1}
              canWrite={canWrite}
            />
          ))}
        </ol>
      </section>

      {/* UPDATES */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
        <header className="flex items-center px-5 py-3">
          <h2 className="text-sm font-bold">Updates</h2>
          <span className="ml-2 text-xs text-ink-muted">
            {updates?.length ?? 0} total
          </span>
        </header>
        {canWrite && (
          <div className="border-t border-hairline px-5 py-4">
            <UpdateComposer
              projectId={project.id}
              stages={stages ?? []}
            />
          </div>
        )}
        <ul className="border-t border-hairline">
          {(updates ?? []).length === 0 ? (
            <li className="px-5 py-8 text-center text-xs text-ink-muted">
              No updates yet. {canWrite ? 'Post the first one above.' : 'Check back soon.'}
            </li>
          ) : (
            updates!.map((u) => {
              const poster = Array.isArray(u.posted_by_profile)
                ? u.posted_by_profile[0]
                : u.posted_by_profile;
              const stage = Array.isArray(u.stage) ? u.stage[0] : u.stage;
              return (
                <li key={u.id} className="border-b border-hairline px-5 py-4 last:border-b-0">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-muted">
                    <span className="font-semibold text-ink">
                      {poster?.full_name ?? 'Unknown'}
                    </span>
                    <span>·</span>
                    <span>{relativeTime(u.posted_at)}</span>
                    {stage && (
                      <>
                        <span>·</span>
                        <span>{stage.name}</span>
                      </>
                    )}
                  </div>
                  {u.headline && (
                    <div className="text-sm font-bold text-ink">{u.headline}</div>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {u.body}
                  </p>
                  {u.decision_needed && (
                    <div className="mt-3 rounded-lg border-l-4 border-accent bg-accent/5 px-3 py-2 text-xs">
                      <div className="font-bold uppercase tracking-wider text-accent-deep">
                        Decision needed
                      </div>
                      <div className="mt-1 text-ink">{u.decision_needed}</div>
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <p className="mt-6 text-center text-[10px] text-ink-muted">
        Photo uploads, reports, invoices and decisions land in the next sessions.
      </p>
    </div>
  );
}

function DateLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function FinanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
