'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { gbp, PLATFORM_PAYMENT_FEE_PENCE } from '@br/shared';
import {
  startConnectOnboarding,
  refreshConnectStatus,
  type ConnectState,
} from '@/lib/server-actions/connect';

export function PaymentsSection({
  initial,
  isUnlimited,
}: {
  initial: ConnectState | null;
  isUnlimited: boolean;
}) {
  const params = useSearchParams();
  const [state, setState] = useState<ConnectState | null>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Coming back from Stripe onboarding — pull the latest status.
  useEffect(() => {
    if (params.get('connect') === 'return') {
      startTransition(async () => {
        const res = await refreshConnectStatus();
        if (res.ok && res.state) setState(res.state);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSetup() {
    setError(null);
    startTransition(async () => {
      const res = await startConnectOnboarding();
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not start setup.');
        return;
      }
      window.location.href = res.url;
    });
  }

  const active = state?.charges_enabled && state?.payouts_enabled;
  const started = !!state?.account_id;
  const pendingVerification = started && state?.details_submitted && !active;

  const feeLabel = isUnlimited
    ? 'Free on your Unlimited plan'
    : `${gbp(PLATFORM_PAYMENT_FEE_PENCE)} per payment collected`;

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white p-6 shadow-card">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Client payments
          </div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight">
            Get paid through the portal
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Let clients pay milestone invoices by bank or card straight from
            their project. Money lands in your own bank account — Builders Ready
            never holds it.
          </p>
        </div>
        {active && (
          <span className="rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            Active
          </span>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-hairline bg-canvas px-4 py-3 text-sm">
        <span className="font-semibold text-ink">Platform fee:</span>{' '}
        <span className="text-ink-muted">{feeLabel}</span>
        {!isUnlimited && (
          <span className="text-ink-muted">
            {' '}
            — a flat fee, never a percentage, so a big milestone doesn&apos;t cost
            you more. You absorb it; it&apos;s never added to the client&apos;s bill.
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-error/30 bg-error/5 px-4 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="mt-5">
        {active ? (
          <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
            <div className="font-semibold text-success">
              Payments are switched on.
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              Clients can now pay invoices in the portal, and payouts go to your
              connected bank account. Manage payout details or bank info any time
              below.
            </div>
            <button
              type="button"
              onClick={onSetup}
              disabled={pending}
              className="mt-3 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-50"
            >
              {pending ? 'Opening…' : 'Manage payout details'}
            </button>
          </div>
        ) : pendingVerification ? (
          <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm">
            <div className="font-semibold text-info">Verification in progress</div>
            <div className="mt-1 text-xs text-ink-muted">
              You&apos;ve submitted your details — Stripe is verifying them. This
              usually takes a few minutes. You can add anything still outstanding
              below.
            </div>
            <button
              type="button"
              onClick={onSetup}
              disabled={pending}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? 'Opening…' : 'Continue setup'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSetup}
            disabled={pending}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Opening…' : started ? 'Continue setup' : 'Set up payments'}
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        Setup is handled securely by Stripe — you&apos;ll be asked for your bank
        details and a few business details to verify your identity. Takes about
        five minutes.
      </p>
    </section>
  );
}
