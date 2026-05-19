'use client';

import { useState, useTransition } from 'react';
import type { SubscriptionTier } from '@br/shared';
import { TIERS } from '@br/shared';
import { createCheckoutSession } from '@/lib/server-actions/billing';

type Cadence = 'monthly' | 'annual';

export function BillingStep({ tier }: { tier: SubscriptionTier }) {
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tierConfig = TIERS[tier];
  const monthlyDisplay = `£${(tierConfig.monthlyPence / 100).toFixed(0)}/mo`;
  const annualDisplay = `£${(tierConfig.annualPence / 100).toFixed(0)}/yr  (= £${(
    tierConfig.annualPence / 12 / 100
  ).toFixed(0)}/mo)`;

  function onContinue() {
    setError(null);
    startTransition(async () => {
      const res = await createCheckoutSession({ cadence });
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not start Checkout.');
        return;
      }
      // Hard navigation to Stripe's hosted Checkout page.
      window.location.href = res.url;
    });
  }

  return (
    <div className="mt-5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
        Billing cadence
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <CadenceCard
          active={cadence === 'monthly'}
          onClick={() => setCadence('monthly')}
          title="Monthly"
          value={monthlyDisplay}
          hint="Cancel any time."
        />
        <CadenceCard
          active={cadence === 'annual'}
          onClick={() => setCadence('annual')}
          title="Annual"
          value={annualDisplay}
          hint="Save 20% vs monthly."
          badge="Best value"
        />
      </div>

      <div className="mt-6 space-y-1 text-xs text-ink-muted">
        <p>· 14-day trial — no charge today</p>
        <p>· Card collected now so renewal is automatic on day 15</p>
        <p>· Cancel any time from Settings or Stripe&apos;s portal — refund prorated</p>
        <p>· UK VAT added at checkout for VAT-registered businesses</p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending
            ? 'Opening Stripe…'
            : `Continue to card →  ${cadence === 'monthly' ? monthlyDisplay : 'annual'}`}
        </button>
      </div>
    </div>
  );
}

function CadenceCard({
  active,
  onClick,
  title,
  value,
  hint,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  value: string;
  hint: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-card border-2 px-4 py-4 text-left transition ${
        active
          ? 'border-primary bg-primary/5'
          : 'border-hairline bg-white hover:border-ink-muted'
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
            active ? 'border-primary' : 'border-hairline'
          }`}
        >
          {active && <div className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        <div className="text-sm font-extrabold text-ink">{title}</div>
      </div>
      <div className="mt-2 text-base font-bold text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-ink-muted">{hint}</div>
    </button>
  );
}
