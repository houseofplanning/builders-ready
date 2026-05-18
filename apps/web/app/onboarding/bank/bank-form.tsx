'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveBankDetails } from '@/lib/server-actions/onboarding';

interface Initial {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  vat_number: string | null;
  company_number: string | null;
}

export function BankForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      bank_name: emptyToNull(fd.get('bank_name')),
      bank_account_name: emptyToNull(fd.get('bank_account_name')),
      bank_sort_code: emptyToNull(fd.get('bank_sort_code')),
      bank_account_number: emptyToNull(fd.get('bank_account_number')),
      vat_number: emptyToNull(fd.get('vat_number')),
      company_number: emptyToNull(fd.get('company_number')),
    };
    startTransition(async () => {
      const res = await saveBankDetails(payload);
      if (!res.ok || !res.redirectTo) {
        setError(res.error ?? 'Failed to save.');
        return;
      }
      router.push(res.redirectTo);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <Field label="Bank name" name="bank_name" defaultValue={initial.bank_name} />
      <Field
        label="Account name"
        name="bank_account_name"
        defaultValue={initial.bank_account_name}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Sort code"
          name="bank_sort_code"
          placeholder="20-12-34"
          defaultValue={initial.bank_sort_code}
        />
        <Field
          label="Account number"
          name="bank_account_number"
          placeholder="12345678"
          defaultValue={initial.bank_account_number}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="VAT number"
          name="vat_number"
          placeholder="GB123 4567 89"
          defaultValue={initial.vat_number}
        />
        <Field
          label="Companies House number"
          name="company_number"
          placeholder="12345678"
          defaultValue={initial.company_number}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={() => router.push('/onboarding/branding')}
          className="rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-ink"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Continue → invite team'}
        </button>
      </div>
    </form>
  );
}

function emptyToNull(v: FormDataEntryValue | null) {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}
