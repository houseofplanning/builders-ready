import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { gbp, TIERS, formatDate, relativeTime } from '@br/shared';
import { ProjectStatusPill } from '@/components/status-pill';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Dashboard({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  const tier = tenant.subscription_tier ? TIERS[tenant.subscription_tier] : null;
  const supabase = await createSupabaseServer();

  // Fire off counts in parallel.
  const [
    { count: activeCount },
    { count: memberCount },
    { data: recent },
    { data: openDecisions },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'on_hold']),
    supabase.from('tenant_members').select('user_id', { count: 'exact', head: true }),
    supabase
      .from('projects')
      .select(
        `id, name, address_line1, city, postcode, status, progress_percent,
         estimated_end_date,
         pm:profiles!projects_pm_id_fkey(full_name)`,
      )
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(4),
    supabase
      .from('decisions')
      .select('id, title, deadline, project:projects(id, name)')
      .eq('status', 'open')
      .order('deadline', { ascending: true })
      .limit(3),
  ]);

  const activeProjects = activeCount ?? 0;
  const limit = tier?.activeProjectLimit ?? 10;
  const limitDisplay = limit >= 100000 ? 'unlimited' : limit;

  return (
    <div>
      <header className="mb-6 flex items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Tenant · {tenant.name}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Welcome back
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {tenant.subscription_status === 'trialing' && tenant.trial_ends_at && (
            <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Trial ends {formatDate(tenant.trial_ends_at)}
            </span>
          )}
          {(role === 'owner' || role === 'pm') && (
            <Link
              href={`/${slug}/projects/new`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              + New project
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <Card label="Active projects">
          <div className="text-2xl font-extrabold tracking-tight">{activeProjects}</div>
          <div className="mt-1 text-xs text-ink-muted">
            of {limitDisplay} on {tier?.label ?? '—'}
          </div>
        </Card>
        <Card label="Team">
          <div className="text-2xl font-extrabold tracking-tight">{memberCount ?? 1}</div>
          <div className="mt-1 text-xs text-ink-muted">
            {memberCount === 1 ? 'Just you so far' : 'across all roles'}
          </div>
        </Card>
        <Card label="Open decisions">
          <div className="text-2xl font-extrabold tracking-tight">
            {openDecisions?.length ?? 0}
          </div>
          <div className="mt-1 text-xs text-ink-muted">awaiting client response</div>
        </Card>
        <Card label="Subscription">
          <div className="text-xl font-extrabold tracking-tight">
            {tier ? gbp(tier.monthlyPence, { whole: true }) : '—'}
            <span className="text-xs font-medium text-ink-muted">/mo</span>
          </div>
          <div className="mt-1 text-xs capitalize text-ink-muted">
            {tenant.subscription_status ?? 'inactive'}
          </div>
        </Card>
      </div>

      {/* Recent projects */}
      <section className="mt-8 rounded-card border border-hairline bg-white shadow-card">
        <header className="flex items-center border-b border-hairline px-5 py-3">
          <h2 className="text-sm font-bold">Recent projects</h2>
          <Link
            href={`/${slug}/projects`}
            className="ml-auto text-xs font-semibold text-primary hover:underline"
          >
            View all →
          </Link>
        </header>
        {(recent ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-ink-muted">No projects yet.</p>
            {(role === 'owner' || role === 'pm') && (
              <Link
                href={`/${slug}/projects/new`}
                className="mt-3 inline-block rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white"
              >
                + Create your first project
              </Link>
            )}
          </div>
        ) : (
          <ul>
            {recent!.map((p, i) => {
              const pm = Array.isArray(p.pm) ? p.pm[0] : p.pm;
              return (
                <li
                  key={p.id}
                  className={i > 0 ? 'border-t border-hairline' : ''}
                >
                  <Link
                    href={`/${slug}/projects/${p.id}`}
                    className="flex items-center px-5 py-3 hover:bg-canvas"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{p.name}</span>
                        <ProjectStatusPill status={p.status} />
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {p.city} · {p.postcode} · PM {pm?.full_name ?? '—'}
                      </div>
                    </div>
                    <div className="mr-4 w-32">
                      <div className="mb-1 flex justify-between text-[10px] text-ink-muted">
                        <span>{p.progress_percent}%</span>
                        <span>{formatDate(p.estimated_end_date, { short: true })}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
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
                    <div className="text-xs font-semibold text-primary">Open →</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Open decisions panel */}
      {(openDecisions?.length ?? 0) > 0 && (
        <section className="mt-4 rounded-card border border-hairline bg-white shadow-card">
          <header className="border-b border-hairline px-5 py-3">
            <h2 className="text-sm font-bold">Decisions needing client response</h2>
          </header>
          <ul>
            {openDecisions!.map((d, i) => {
              const proj = Array.isArray(d.project) ? d.project[0] : d.project;
              return (
                <li
                  key={d.id}
                  className={`flex items-center px-5 py-3 text-sm ${
                    i > 0 ? 'border-t border-hairline' : ''
                  }`}
                >
                  <span className="mr-3 inline-block h-2 w-2 rounded-full bg-accent" />
                  <span className="flex-1">
                    <span className="font-semibold">{proj?.name ?? 'Project'}</span> — {d.title}
                  </span>
                  {d.deadline && (
                    <span className="text-[11px] text-ink-muted">
                      deadline {relativeTime(d.deadline)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-5 shadow-card">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        {label}
      </div>
      {children}
    </div>
  );
}
