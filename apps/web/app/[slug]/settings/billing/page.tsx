import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTenantBySlug, isTenantInGoodStanding } from '@/lib/tenant-resolver';
import { TIERS, gbp, formatDate } from '@br/shared';
import { OpenPortalButton } from './portal-button';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BillingSettingsPage({ params }: Props) {
  const { slug } = await params;
  // allowInactive: this is the one page a locked-out tenant must still reach.
  const { tenant, role } = await requireTenantBySlug(slug, { allowInactive: true });
  const inactive = !isTenantInGoodStanding(tenant);

  if (role !== 'owner') {
    // Owners manage billing. Other members are normally bounced to the
    // dashboard — but if the tenant is locked out, bouncing would loop
    // against the access gate, so show them a notice instead.
    if (!inactive) {
      redirect(`/${slug}/dashboard`);
    }
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-extrabold tracking-tight">Subscription inactive</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This account&apos;s subscription has ended. Please ask your account
          owner to renew it to restore access.
        </p>
      </div>
    );
  }

  const tierId = tenant.subscription_tier ?? 'starter';
  const tier = TIERS[tierId];
  const status = tenant.subscription_status ?? 'inactive';

  const statusPill =
    status === 'trialing'
      ? { label: 'Trialing', bg: 'bg-info/10', fg: 'text-info' }
      : status === 'active'
        ? { label: 'Active', bg: 'bg-success/10', fg: 'text-success' }
        : status === 'past_due'
          ? { label: 'Past due', bg: 'bg-error/10', fg: 'text-error' }
          : status === 'cancelled' || status === 'suspended'
            ? { label: 'Cancelled', bg: 'bg-canvas', fg: 'text-ink-muted' }
            : { label: status, bg: 'bg-canvas', fg: 'text-ink-muted' };

  const trialMs = tenant.trial_ends_at
    ? new Date(tenant.trial_ends_at).getTime() - Date.now()
    : null;
  const trialDaysLeft =
    trialMs !== null ? Math.max(0, Math.ceil(trialMs / (1000 * 60 * 60 * 24))) : null;

  return (
    <div>
      <header className="mb-6 flex items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Settings
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Billing</h1>
        </div>
        <div className="ml-auto flex gap-2 text-sm">
          <Link
            href={`/${slug}/dashboard`}
            className="rounded-lg border border-hairline bg-white px-3 py-1.5 font-semibold text-ink"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {inactive && (
        <div className="mb-6 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm">
          <div className="font-semibold text-error">Access paused</div>
          <div className="mt-1 text-xs text-ink-muted">
            Your trial or subscription has ended, so the rest of Builders Ready
            is locked until you subscribe. Start your plan below to restore
            access.
          </div>
        </div>
      )}

      {/* Current plan */}
      <section className="rounded-card border border-hairline bg-white p-6 shadow-card">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Current plan
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-3xl font-extrabold tracking-tight text-ink">
                {tier.label}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusPill.bg} ${statusPill.fg}`}
              >
                {statusPill.label}
              </span>
            </div>
            <div className="mt-2 text-sm text-ink-muted">
              {gbp(tier.monthlyPence, { whole: true })}/month or{' '}
              {gbp(tier.annualPence, { whole: true })}/year ·{' '}
              {tier.activeProjectLimit >= 100000
                ? 'Unlimited'
                : `Up to ${tier.activeProjectLimit}`}{' '}
              active projects
            </div>
          </div>
        </div>

        {/* Trial / renewal */}
        {status === 'trialing' && tenant.trial_ends_at && (
          <div className="mt-5 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm">
            <div className="font-semibold text-info">
              Trial ends in {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              Auto-renews on {formatDate(tenant.trial_ends_at)}. Cancel any
              time before then for no charge.
            </div>
          </div>
        )}
        {status === 'active' && tenant.current_period_end && (
          <div className="mt-5 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
            <div className="font-semibold text-success">
              Next charge: {formatDate(tenant.current_period_end)}
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              Update payment method, switch plans or cancel in the Stripe portal.
            </div>
          </div>
        )}
        {status === 'past_due' && (
          <div className="mt-5 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm">
            <div className="font-semibold text-error">
              Payment failed
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              Open the portal and update your payment method. Your tenant
              becomes read-only once we&apos;re fully past due.
            </div>
          </div>
        )}
        {(status === 'cancelled' || status === 'suspended') && (
          <div className="mt-5 rounded-lg border border-hairline bg-canvas px-4 py-3 text-sm">
            <div className="font-semibold">Subscription cancelled.</div>
            <div className="mt-1 text-xs text-ink-muted">
              Resubscribe from the portal to keep using Builders Ready.
            </div>
          </div>
        )}

        <div className="mt-6">
          {tenant.stripe_customer_id ? (
            <OpenPortalButton />
          ) : (
            <div className="text-sm text-ink-muted">
              No Stripe customer linked yet. Finish onboarding billing first via{' '}
              <Link href="/onboarding/billing" className="text-primary underline">
                /onboarding/billing
              </Link>
              .
            </div>
          )}
        </div>
      </section>

      <p className="mt-4 text-xs text-ink-muted">
        Tax (UK VAT) is added at checkout based on your business address. Receipts
        are emailed automatically by Stripe.
      </p>
    </div>
  );
}
