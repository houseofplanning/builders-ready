import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { gbp, TIERS, formatDate } from '@br/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Dashboard({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  const tier = tenant.subscription_tier ? TIERS[tenant.subscription_tier] : null;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">
        Welcome to {tenant.name}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Signed in as {role === 'owner' ? 'owner' : role}. Sprint 0 Day 2 scaffold — projects,
        decisions, variations and invoices land next session.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card label="Subscription">
          <div className="text-2xl font-extrabold tracking-tight">
            {tier?.label ?? '—'}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {tenant.subscription_status === 'trialing' && tenant.trial_ends_at
              ? `Trial ends ${formatDate(tenant.trial_ends_at)}`
              : tenant.subscription_status}
          </div>
          {tier && (
            <div className="mt-2 text-xs">
              <span className="font-semibold">{gbp(tier.monthlyPence)}/mo</span>
              <span className="text-ink-muted"> · up to {tier.activeProjectLimit === 100000 ? 'unlimited' : tier.activeProjectLimit} active projects</span>
            </div>
          )}
        </Card>

        <Card label="Active projects">
          <div className="text-2xl font-extrabold tracking-tight">0</div>
          <div className="mt-1 text-xs text-ink-muted">
            Create your first project next session
          </div>
        </Card>

        <Card label="Team">
          <div className="text-2xl font-extrabold tracking-tight">1</div>
          <div className="mt-1 text-xs text-ink-muted">Just you so far — invite PMs soon</div>
        </Card>
      </div>

      <section className="mt-10 rounded-card border border-hairline bg-white p-6 shadow-card">
        <h2 className="text-base font-extrabold">What you can do today</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <span>
              Adjust your branding under{' '}
              <a
                href={`/${slug}/dashboard/branding`}
                className="font-semibold text-primary hover:underline"
              >
                Settings → Branding
              </a>{' '}
              (coming next session)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Sign out and back in to confirm session persistence</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <span>
              Try the URL <code>/{slug}/dashboard</code> — RLS will keep other tenants&rsquo; data
              invisible
            </span>
          </li>
        </ul>
      </section>
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
