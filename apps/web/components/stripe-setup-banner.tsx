'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Prominent, dismissible prompt shown to builders who haven't set up card
 * payments (Stripe Connect) yet. Loud on first sign-in; the X dismisses it and
 * we remember that per tenant in localStorage so it doesn't nag every load.
 * Re-appears only if they clear storage / use another browser — which is fine,
 * since it stops showing the moment card payments go live (the parent only
 * renders this when charges aren't enabled).
 */
export function StripeSetupBanner({
  slug,
  tenantId,
}: {
  slug: string;
  tenantId: string;
}) {
  const key = `br.stripeBanner.dismissed.${tenantId}`;
  // Start hidden to avoid a flash before we can read localStorage, then reveal.
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(key) !== '1') setShow(true);
    } catch {
      setShow(true);
    }
  }, [key]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="border-b border-primary/20 bg-primary/5">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-base text-white sm:flex">
          💳
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            Set up card payments to get paid faster
          </p>
          <p className="text-xs text-ink-muted">
            Connect Stripe so clients can pay invoices by card straight to your bank.
            Takes a few minutes — bank transfer and cash still work without it.
          </p>
        </div>
        <Link
          href={`/${slug}/settings/billing`}
          className="shrink-0 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          Set up payments
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-primary/10 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
