'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  customerDecideDecision,
  customerSignVariation,
  payInvoiceAsCustomer,
  requestCashPaymentAsCustomer,
} from '@/lib/server-actions/marketplace';

export function DecisionAccept({
  decisionId,
  options,
}: {
  decisionId: string;
  options: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(optionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await customerDecideDecision(decisionId, optionId);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {options.map((o) => (
        <button
          key={o.id}
          disabled={pending}
          onClick={() => choose(o.id)}
          className="w-full rounded-lg border border-primary px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-60"
        >
          Choose: {o.label}
        </button>
      ))}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

export function VariationSign({ variationId }: { variationId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function sign() {
    setError(null);
    if (!name.trim()) {
      setError('Type your name to sign.');
      return;
    }
    startTransition(async () => {
      const res = await customerSignVariation(variationId, name);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Type your full name to approve"
        className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <button
        disabled={pending}
        onClick={sign}
        className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? 'Signing…' : 'Approve & sign'}
      </button>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

export function PayButton({
  invoiceId,
  cashRequested,
}: {
  invoiceId: string;
  cashRequested?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    startTransition(async () => {
      const res = await payInvoiceAsCustomer(invoiceId);
      if (!res.ok || !res.url) {
        setError(res.error ?? 'Could not start payment.');
        return;
      }
      window.location.href = res.url;
    });
  }

  function cash() {
    setError(null);
    startTransition(async () => {
      const res = await requestCashPaymentAsCustomer(invoiceId);
      if (!res.ok) {
        setError(res.error ?? 'Could not update.');
        return;
      }
      router.refresh();
    });
  }

  if (cashRequested) {
    return (
      <span className="text-right text-xs font-semibold text-ink-muted">
        Cash flagged — awaiting builder
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          onClick={pay}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {pending ? '…' : 'Pay by card'}
        </button>
        <button
          disabled={pending}
          onClick={cash}
          className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary disabled:opacity-60"
        >
          Pay in cash
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
