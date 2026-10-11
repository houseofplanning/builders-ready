'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PaymentMethod } from '@br/shared';
import {
  customerDecideDecision,
  customerSignVariation,
  payInvoiceAsCustomer,
  requestCashPaymentAsCustomer,
  requestBankPaymentAsCustomer,
} from '@/lib/server-actions/marketplace';

export interface BankDetails {
  name: string | null;
  accountName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
}

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
  methods,
  bankDetails,
  cashRequested,
  bankRequested,
}: {
  invoiceId: string;
  methods: PaymentMethod[];
  bankDetails?: BankDetails | null;
  cashRequested?: boolean;
  bankRequested?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showBank, setShowBank] = useState(false);

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

  function flagCash() {
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

  function flagBank() {
    setError(null);
    startTransition(async () => {
      const res = await requestBankPaymentAsCustomer(invoiceId);
      if (!res.ok) {
        setError(res.error ?? 'Could not update.');
        return;
      }
      router.refresh();
    });
  }

  // Already flagged — show the waiting state, whichever method.
  if (cashRequested) {
    return (
      <span className="text-right text-xs font-semibold text-emerald-700">
        ✓ Cash flagged — your builder will confirm receipt
      </span>
    );
  }
  if (bankRequested) {
    return (
      <span className="text-right text-xs font-semibold text-emerald-700">
        ✓ Bank transfer flagged — your builder will confirm receipt
      </span>
    );
  }

  if (methods.length === 0) {
    return (
      <span className="text-right text-xs text-ink-muted">
        Your builder will confirm payment.
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {methods.includes('card') && (
          <button
            disabled={pending}
            onClick={pay}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {pending ? '…' : 'Pay by card'}
          </button>
        )}
        {methods.includes('bank') && (
          <button
            disabled={pending}
            onClick={() => setShowBank((v) => !v)}
            className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary disabled:opacity-60"
          >
            Bank transfer
          </button>
        )}
        {methods.includes('cash') && (
          <button
            disabled={pending}
            onClick={flagCash}
            className="rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary disabled:opacity-60"
          >
            Pay in cash
          </button>
        )}
      </div>

      {showBank && methods.includes('bank') && (
        <div className="mt-1 w-full max-w-xs rounded-lg border border-hairline bg-canvas p-3 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Transfer to
          </p>
          <dl className="mt-1 space-y-0.5 text-xs text-ink">
            {bankDetails?.accountName && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Name</dt>
                <dd className="font-semibold">{bankDetails.accountName}</dd>
              </div>
            )}
            {bankDetails?.name && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Bank</dt>
                <dd className="font-semibold">{bankDetails.name}</dd>
              </div>
            )}
            {bankDetails?.sortCode && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Sort code</dt>
                <dd className="font-semibold">{bankDetails.sortCode}</dd>
              </div>
            )}
            {bankDetails?.accountNumber && (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Account no.</dt>
                <dd className="font-semibold">{bankDetails.accountNumber}</dd>
              </div>
            )}
          </dl>
          <p className="mt-2 text-[11px] text-ink-muted">
            Use your project name as the reference. Once you&apos;ve sent it, tap below
            and your builder will confirm receipt.
          </p>
          <button
            disabled={pending}
            onClick={flagBank}
            className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {pending ? '…' : "I've paid by bank transfer"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
