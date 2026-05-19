import { requireAuth } from '@/lib/tenant-resolver';
import { TIERS } from '@br/shared';
import { BillingStep } from './billing-step';

interface Props {
  searchParams: Promise<{ cancelled?: string }>;
}

export default async function BillingOnboardingStep({ searchParams }: Props) {
  const { tenant } = await requireAuth();
  const { cancelled } = await searchParams;

  const tier = tenant.subscription_tier ?? 'starter';
  const tierConfig = TIERS[tier];

  return (
    <section className="rounded-card border border-hairline bg-white p-7 shadow-card">
      <h1 className="text-lg font-extrabold">Start your free trial</h1>
      <p className="mt-1 text-xs text-ink-muted">
        14 days free. Your card is collected now so we can auto-renew on day 15
        — you can cancel any time from your settings before then and we won&apos;t
        charge a thing.
      </p>

      {cancelled === '1' && (
        <div className="mt-4 rounded-lg border border-warning bg-warning/10 px-3 py-2 text-xs text-ink">
          You cancelled before entering your card. No worries — pick a cadence
          below and try again.
        </div>
      )}

      <div className="mt-6 rounded-lg border border-hairline bg-canvas p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          Your plan
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-ink">
            {tierConfig.label}
          </span>
          <span className="text-sm text-ink-muted">
            ·{' '}
            {tierConfig.activeProjectLimit >= 100000
              ? 'unlimited'
              : `up to ${tierConfig.activeProjectLimit}`}{' '}
            active projects
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          You picked this at signup. Need to switch? Pick a different cadence
          below to start, or change tier later from Settings.
        </p>
      </div>

      <BillingStep tier={tier} />
    </section>
  );
}
