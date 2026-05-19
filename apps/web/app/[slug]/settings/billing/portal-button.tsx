'use client';

import { useState, useTransition } from 'react';
import { createPortalSession } from '@/lib/server-actions/billing';

export function OpenPortalButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await createPortalSession();
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not open portal.');
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Opening portal…' : 'Manage billing in Stripe →'}
      </button>
      {error && (
        <div className="mt-3 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
    </div>
  );
}
