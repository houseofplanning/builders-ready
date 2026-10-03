'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { gbp, PLATFORM_PAYMENT_FEE_PENCE } from '@br/shared';
import { startConnectOnboarding } from '@/lib/server-actions/connect';
import { BankForm } from './bank-form';

interface Initial {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  vat_number: string | null;
  company_number: string | null;
}

type Mode = 'choose' | 'manual' | 'stripe';

export function SetupChoice({
  initial,
  isUnlimited,
}: {
  initial: Initial;
  isUnlimited: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startStripe() {
    setError(null);
    startTransition(async () => {
      const res = await startConnectOnboarding({
        returnTo: '/onboarding/invite',
        refreshTo: '/onboarding/bank',
      });
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not start Stripe setup.');
        return;
      }
      window.location.href = res.url;
    });
  }

  const feeLine = isUnlimited
    ? 'Free on your Unlimited plan.'
    : `${gbp(PLATFORM_PAYMENT_FEE_PENCE)} per payment — a flat fee, never a percentage. You absorb it; it's never added to the client's bill.`;

  if (mode === 'manual') {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setMode('choose')}
          className="mb-2 text-xs font-semibold text-primary hover:underline"
        >
          ← Choose a different option
        </button>
        <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-xs text-ink">
          <strong className="font-bold">This is not how you&rsquo;re charged.</strong>{' '}
          Anything you enter here is purely for display on the invoices you send
          to your clients, so they can pay you by bank transfer.
        </div>
        <BankForm initial={initial} />
      </div>
    );
  }

  if (mode === 'stripe') {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setMode('choose')}
          className="mb-3 text-xs font-semibold text-primary hover:underline"
        >
          ← Choose a different option
        </button>
        <div className="rounded-card border border-hairline bg-canvas p-5">
          <h2 className="text-sm font-extrabold">Get paid on Builders Ready</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Set up your Stripe Express account and your clients can pay invoices
            by card or bank straight from their project — the money lands in your
            own bank account. Stripe handles your bank details and verification
            securely; it takes about five minutes.
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            <span className="font-semibold text-ink">Platform fee:</span> {feeLine}
          </p>
          {error && (
            <div className="mt-3 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startStripe}
              disabled={pending}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? 'Opening Stripe…' : 'Set up Stripe Express'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/onboarding/invite')}
              className="text-sm font-semibold text-ink-muted hover:text-ink"
            >
              Skip for now →
            </button>
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">
            You can set this up (or switch to it) any time later from Billing
            settings.
          </p>
        </div>
      </div>
    );
  }

  // mode === 'choose'
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <OptionCard
        title="Manual invoices"
        badge="Simple"
        body="Add your bank and company details. Clients pay you by bank transfer using the details printed on each invoice, and you mark invoices paid yourself."
        cta="Use manual invoices"
        onClick={() => setMode('manual')}
      />
      <OptionCard
        title="Get paid on Builders Ready"
        badge="Recommended"
        highlight
        body="Set up Stripe Express and let clients pay invoices by card or bank, straight to your account — paid the day a milestone's signed off, no chasing bank transfers."
        cta="Set up Stripe Express"
        onClick={() => setMode('stripe')}
      />
    </div>
  );
}

function OptionCard({
  title,
  badge,
  body,
  cta,
  onClick,
  highlight,
}: {
  title: string;
  badge: string;
  body: string;
  cta: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-card border p-5 ${
        highlight ? 'border-primary bg-primary/5' : 'border-hairline bg-white'
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-sm font-extrabold">{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            highlight ? 'bg-primary text-white' : 'bg-canvas text-ink-muted'
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="flex-1 text-xs leading-relaxed text-ink-muted">{body}</p>
      <button
        type="button"
        onClick={onClick}
        className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold ${
          highlight
            ? 'bg-primary text-white'
            : 'border border-hairline bg-white text-ink hover:bg-canvas'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
