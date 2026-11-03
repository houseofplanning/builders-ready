'use client';

import { useState, useTransition } from 'react';
import { updateBankDetails } from '@/lib/server-actions/onboarding';

interface Initial {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  vat_number: string | null;
  company_number: string | null;
}

export function BankDetailsSection({ initial }: { initial: Initial }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
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
      const res = await updateBankDetails(payload);
      if (!res.ok) {
        setError(res.error ?? 'Failed to save.');
        return;
      }
      setSaved(true);
    });
  }

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white p-6 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
        Bank transfer details
      </div>
      <h2 className="mt-1 text-lg font-extrabold tracking-tight">How clients pay you by transfer</h2>
      <p className="mt-1 text-sm text-ink-muted">
        These appear on invoices when you offer bank transfer, so your clients
        know exactly where to send the money. Separate from card payments (Stripe
        above) and from your Builders Ready subscription.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <Field label="Bank name" name="bank_name" defaultValue={initial.bank_name} placeholder="e.g. Barclays" />
        <Field
          label="Account name"
          name="bank_account_name"
          defaultValue={initial.bank_account_name}
          placeholder="The name on the account"
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sort code" name="bank_sort_code" placeholder="20-12-34" defaultValue={initial.bank_sort_code} />
          <Field label="Account number" name="bank_account_number" placeholder="12345678" defaultValue={initial.bank_account_number} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="VAT number (optional)" name="vat_number" placeholder="GB123 4567 89" defaultValue={initial.vat_number} />
          <Field label="Companies House number (optional)" name="company_number" placeholder="12345678" defaultValue={initial.company_number} />
        </div>

        {error && (
          <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
            Saved — your invoices will now show these details.
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save bank details'}
          </button>
        </div>
      </form>
    </section>
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
