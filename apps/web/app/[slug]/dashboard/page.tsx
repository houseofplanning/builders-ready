import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { gbp, TIERS, formatDate, relativeTime } from '@br/shared';
import { ProjectStatusPill } from '@/components/status-pill';
import { DashboardGreeting } from './dashboard-greeting';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Dashboard({ params }: Props) {
  const { slug } = await params;
  const { tenant, role, user_id } = await requireTenantBySlug(slug);
  const tier = tenant.subscription_tier ? TIERS[tenant.subscription_tier] : null;
  const supabase = await createSupabaseServer();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Fetch counts + summaries in parallel.
  const [
    { count: activeCount },
    { count: memberCount },
    { data: recent },
    { data: openDecisions },
    { data: openVariations },
    { data: unpaidInvoices },
    { data: quoteRows },
    { data: financeRows },
    { data: profile },
    { data: activityRows },
    { data: paidThisMonthRows },
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
      .limit(5),
    supabase
      .from('decisions')
      .select('id, title, deadline, created_at, project:projects(id, name)')
      .eq('status', 'open')
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from('variations')
      .select(
        'id, number, title, delta_amount_gbp_pence, status, created_at, project:projects(id, name)',
      )
      .eq('status', 'proposed')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('invoices')
      .select(
        'id, number, title, amount_gbp_pence, due_at, status, project:projects(id, name)',
      )
      .in('status', ['sent', 'overdue'])
      .order('due_at', { ascending: true })
      .limit(8),
    // Quotes for non-archived projects (used for "total contracted").
    supabase
      .from('projects')
      .select('id, quoted_amount_pence')
      .neq('status', 'archived'),
    // Finance roll-up. project_finance is a VIEW, so query it directly.
    supabase
      .from('project_finance')
      .select('project_id, variations_pence, invoiced_pence, paid_pence'),
    // Current user's name for the greeting.
    supabase.from('profiles').select('full_name').eq('id', user_id).maybeSingle(),
    // Recent activity across all projects (timeline updates).
    supabase
      .from('project_updates')
      .select('id, headline, posted_at, project:projects(id, name)')
      .order('posted_at', { ascending: false })
      .limit(8),
    // Payments received this calendar month.
    supabase
      .from('invoices')
      .select('amount_gbp_pence')
      .eq('status', 'paid')
      .gte('paid_at', monthStart),
  ]);

  const activeProjects = activeCount ?? 0;
  const limit = tier?.activeProjectLimit ?? 10;
  const limitDisplay = limit >= 100000 ? 'unlimited' : limit;

  // ---------- Cross-project finance roll-up ----------
  const activeProjectIds = new Set((quoteRows ?? []).map((p) => p.id));
  let totalQuoted = 0;
  for (const p of quoteRows ?? []) totalQuoted += Number(p.quoted_amount_pence ?? 0);
  let totalVariations = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  for (const f of financeRows ?? []) {
    if (!activeProjectIds.has(f.project_id)) continue;
    totalVariations += Number(f.variations_pence ?? 0);
    totalInvoiced += Number(f.invoiced_pence ?? 0);
    totalPaid += Number(f.paid_pence ?? 0);
  }
  const totalContracted = totalQuoted + totalVariations;
  const totalOutstanding = totalInvoiced - totalPaid;

  let paidThisMonth = 0;
  for (const r of paidThisMonthRows ?? []) paidThisMonth += Number(r.amount_gbp_pence ?? 0);

  const firstName = (profile?.full_name ?? '').trim().split(/\s+/)[0] || null;

  // ---------- Needs-your-attention items ----------
  const nowMs = Date.now();
  const overdueInvoices = (unpaidInvoices ?? []).filter(
    (inv) => inv.due_at && new Date(inv.due_at).getTime() < nowMs,
  );
  const lateDecisions = (openDecisions ?? []).filter(
    (d) => d.deadline && new Date(d.deadline).getTime() < nowMs,
  );
  const attention: {
    label: string;
    count: number;
    href: string;
    tone: 'error' | 'accent' | 'primary';
  }[] = [];
  if (overdueInvoices.length)
    attention.push({
      label: overdueInvoices.length === 1 ? 'overdue invoice' : 'overdue invoices',
      count: overdueInvoices.length,
      href: `/${slug}/projects`,
      tone: 'error',
    });
  if (lateDecisions.length)
    attention.push({
      label:
        lateDecisions.length === 1
          ? 'decision past its deadline'
          : 'decisions past their deadline',
      count: lateDecisions.length,
      href: `/${slug}/projects`,
      tone: 'accent',
    });
  if ((openVariations?.length ?? 0) > 0)
    attention.push({
      label:
        openVariations!.length === 1
          ? 'variation awaiting signature'
          : 'variations awaiting signature',
      count: openVariations!.length,
      href: `/${slug}/projects`,
      tone: 'primary',
    });

  // ---------- Activity feed ----------
  const activity = (activityRows ?? []).map((u) => {
    const proj = Array.isArray(u.project) ? u.project[0] : u.project;
    return {
      id: u.id,
      headline: u.headline as string,
      projectName: proj?.name ?? 'Project',
      href: proj ? `/${slug}/projects/${proj.id}` : `/${slug}/projects`,
      at: u.posted_at as string,
    };
  });

  return (
    <div>
      <header className="mb-6 flex items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            {tenant.name}
          </div>
          <DashboardGreeting firstName={firstName} />
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

      {/* Needs your attention */}
      {attention.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-white p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Needs your attention
          </span>
          {attention.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                a.tone === 'error'
                  ? 'bg-error/10 text-error'
                  : a.tone === 'accent'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-primary/10 text-primary'
              }`}
            >
              <span className="text-base font-extrabold">{a.count}</span>
              <span>{a.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Operational counters */}
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
        <Card label="Awaiting signature">
          <div className="text-2xl font-extrabold tracking-tight">
            {openVariations?.length ?? 0}
          </div>
          <div className="mt-1 text-xs text-ink-muted">variations not yet signed</div>
        </Card>
      </div>

      {/* Cross-project finance */}
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Card label="Total contracted">
          <div className="text-xl font-extrabold tracking-tight">
            {gbp(totalContracted, { whole: true })}
          </div>
          <div className="mt-1 text-xs text-ink-muted">quoted + signed variations</div>
        </Card>
        <Card label="Invoiced">
          <div className="text-xl font-extrabold tracking-tight">
            {gbp(totalInvoiced, { whole: true })}
          </div>
          <div className="mt-1 text-xs text-ink-muted">all active projects</div>
        </Card>
        <Card label="Paid">
          <div className="text-xl font-extrabold tracking-tight">
            {gbp(totalPaid, { whole: true })}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {paidThisMonth > 0
              ? `${gbp(paidThisMonth, { whole: true })} received this month`
              : 'received to date'}
          </div>
        </Card>
        <Card label="Outstanding">
          <div className="text-xl font-extrabold tracking-tight">
            {gbp(totalOutstanding, { whole: true })}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {(unpaidInvoices?.length ?? 0)} unpaid invoice
            {(unpaidInvoices?.length ?? 0) === 1 ? '' : 's'}
          </div>
        </Card>
      </div>

      {/* Cash position chart + recent activity */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <FinanceChart
            contracted={totalContracted}
            invoiced={totalInvoiced}
            paid={totalPaid}
            outstanding={totalOutstanding}
          />
        </div>
        <ActivityFeed items={activity} />
      </div>

      {/* Recent projects */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
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
              const atRisk =
                p.estimated_end_date &&
                new Date(p.estimated_end_date).getTime() < nowMs &&
                p.status !== 'complete' &&
                p.status !== 'archived';
              return (
                <li key={p.id} className={i > 0 ? 'border-t border-hairline' : ''}>
                  <Link
                    href={`/${slug}/projects/${p.id}`}
                    className="flex items-center px-5 py-3 hover:bg-canvas"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{p.name}</span>
                        <ProjectStatusPill status={p.status} />
                        {atRisk && (
                          <span className="rounded-full bg-error/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-error">
                            Overdue
                          </span>
                        )}
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

      {/* Outstanding items: decisions / variations / invoices */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <OutstandingPanel
          title="Open decisions"
          empty="No open decisions."
          items={(openDecisions ?? []).map((d) => {
            const proj = Array.isArray(d.project) ? d.project[0] : d.project;
            return {
              href: proj ? `/${slug}/projects/${proj.id}` : `/${slug}/projects`,
              primary: proj?.name ?? 'Project',
              secondary: d.title,
              meta: d.deadline ? `deadline ${relativeTime(d.deadline)}` : null,
            };
          })}
          accent="accent"
        />
        <OutstandingPanel
          title="Variations awaiting signature"
          empty="All variations signed off."
          items={(openVariations ?? []).map((v) => {
            const proj = Array.isArray(v.project) ? v.project[0] : v.project;
            return {
              href: proj ? `/${slug}/projects/${proj.id}` : `/${slug}/projects`,
              primary: proj?.name ?? 'Project',
              secondary: `${v.number} · ${v.title}`,
              meta: `${v.delta_amount_gbp_pence > 0 ? '+' : ''}${gbp(
                Number(v.delta_amount_gbp_pence),
                { whole: true },
              )}`,
            };
          })}
          accent="primary"
        />
        <OutstandingPanel
          title="Unpaid invoices"
          empty="No unpaid invoices."
          items={(unpaidInvoices ?? []).map((inv) => {
            const proj = Array.isArray(inv.project) ? inv.project[0] : inv.project;
            const overdue = new Date(inv.due_at) < new Date();
            return {
              href: proj ? `/${slug}/projects/${proj.id}` : `/${slug}/projects`,
              primary: proj?.name ?? 'Project',
              secondary: `${inv.number} · ${gbp(Number(inv.amount_gbp_pence), {
                whole: true,
              })}`,
              meta: `${overdue ? 'overdue' : 'due'} ${relativeTime(inv.due_at)}`,
              warn: overdue,
            };
          })}
          accent="error"
        />
      </div>
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

function FinanceChart({
  contracted,
  invoiced,
  paid,
  outstanding,
}: {
  contracted: number;
  invoiced: number;
  paid: number;
  outstanding: number;
}) {
  const max = Math.max(contracted, invoiced, paid, outstanding, 1);
  const rows: { label: string; value: number; cls: string }[] = [
    { label: 'Contracted', value: contracted, cls: 'bg-primary' },
    { label: 'Invoiced', value: invoiced, cls: 'bg-primary/60' },
    { label: 'Paid', value: paid, cls: 'bg-success' },
    { label: 'Outstanding', value: outstanding, cls: 'bg-accent' },
  ];
  return (
    <section className="h-full rounded-card border border-hairline bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-bold">Cash position</h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-muted">{r.label}</span>
              <span className="font-semibold text-ink">{gbp(r.value, { whole: true })}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-canvas">
              <div
                className={`h-full rounded-full ${r.cls}`}
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-ink-muted">
        Across all active projects. Outstanding = invoiced minus paid.
      </p>
    </section>
  );
}

function ActivityFeed({
  items,
}: {
  items: { id: string; headline: string; projectName: string; href: string; at: string }[];
}) {
  return (
    <section className="rounded-card border border-hairline bg-white shadow-card">
      <header className="border-b border-hairline px-5 py-3">
        <h2 className="text-sm font-bold">Recent activity</h2>
      </header>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-ink-muted">
          No activity yet. Updates you post will show here.
        </div>
      ) : (
        <ul>
          {items.map((it, i) => (
            <li key={it.id} className={i > 0 ? 'border-t border-hairline' : ''}>
              <Link href={it.href} className="block px-5 py-3 hover:bg-canvas">
                <div className="truncate text-sm font-medium text-ink">{it.headline}</div>
                <div className="text-[11px] text-ink-muted">
                  {it.projectName} · {relativeTime(it.at)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface OutstandingItem {
  href: string;
  primary: string;
  secondary: string;
  meta: string | null;
  warn?: boolean;
}

function OutstandingPanel({
  title,
  empty,
  items,
  accent,
}: {
  title: string;
  empty: string;
  items: OutstandingItem[];
  accent: 'accent' | 'primary' | 'error';
}) {
  const dotClass =
    accent === 'accent'
      ? 'bg-accent'
      : accent === 'primary'
        ? 'bg-primary'
        : 'bg-error';
  return (
    <section className="rounded-card border border-hairline bg-white shadow-card">
      <header className="border-b border-hairline px-5 py-3">
        <h2 className="text-sm font-bold">
          {title} · {items.length}
        </h2>
      </header>
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center text-xs text-ink-muted">{empty}</div>
      ) : (
        <ul>
          {items.map((it, i) => (
            <li
              key={`${it.primary}-${i}`}
              className={i > 0 ? 'border-t border-hairline' : ''}
            >
              <Link href={it.href} className="block px-5 py-3 text-sm hover:bg-canvas">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClass}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{it.primary}</div>
                    <div className="truncate text-[11px] text-ink-muted">{it.secondary}</div>
                    {it.meta && (
                      <div
                        className={`mt-0.5 text-[10px] ${
                          it.warn ? 'text-error' : 'text-ink-muted'
                        }`}
                      >
                        {it.meta}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
