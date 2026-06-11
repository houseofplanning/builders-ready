'use client';

import { useState, useTransition } from 'react';
import { gbp, formatDate } from '@br/shared';
import {
  proposeVariationOnWeb,
  withdrawVariationOnWeb,
} from '@/lib/server-actions/variations';

export interface VariationRow {
  id: string;
  number: string;
  title: string;
  description: string | null;
  delta_amount_gbp_pence: number;
  delta_days: number;
  status: 'proposed' | 'accepted' | 'rejected' | 'withdrawn';
  decided_at: string | null;
  client_signature: string | null;
  proposed_by_name: string;
}

export function VariationsSection({
  projectId,
  variations,
  canWrite,
  suggestedNextNumber,
}: {
  projectId: string;
  variations: VariationRow[];
  canWrite: boolean;
  suggestedNextNumber: string;
}) {
  const [showForm, setShowForm] = useState(false);

  const acceptedSum = variations
    .filter((v) => v.status === 'accepted')
    .reduce((s, v) => s + Number(v.delta_amount_gbp_pence), 0);

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex items-center px-5 py-3">
        <h2 className="text-sm font-bold">Variations</h2>
        <span className="ml-2 text-xs text-ink-muted">
          {variations.length} total ·{' '}
          <span className="font-semibold">
            {gbp(acceptedSum, { whole: true })}
          </span>{' '}
          signed
        </span>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? 'Cancel' : '+ Propose variation'}
          </button>
        )}
      </header>

      {showForm && (
        <div className="border-t border-hairline px-5 py-4">
          <ProposeForm
            projectId={projectId}
            suggestedNumber={suggestedNextNumber}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      <ul className="border-t border-hairline">
        {variations.length === 0 ? (
          <li className="px-5 py-8 text-center text-xs text-ink-muted">
            No variations on this project yet.
          </li>
        ) : (
          variations.map((v) => (
            <VariationRowComponent key={v.id} variation={v} canWrite={canWrite} />
          ))
        )}
      </ul>
    </section>
  );
}

function VariationRowComponent({
  variation,
  canWrite,
}: {
  variation: VariationRow;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onWithdraw() {
    if (!confirm(`Withdraw variation ${variation.number}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await withdrawVariationOnWeb({ variation_id: variation.id });
      if (!res.ok) setError(res.error ?? 'Failed.');
    });
  }

  const amountDisplay = `${
    variation.delta_amount_gbp_pence > 0 ? '+' : ''
  }${gbp(Number(variation.delta_amount_gbp_pence))}`;
  const daysDisplay =
    variation.delta_days === 0
      ? null
      : `${variation.delta_days > 0 ? '+' : ''}${variation.delta_days} day${
          Math.abs(variation.delta_days) === 1 ? '' : 's'
        }`;

  return (
    <li className="border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {variation.number}
            </span>
            <span className="text-sm font-bold">{variation.title}</span>
            <StatusPill status={variation.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Proposed by {variation.proposed_by_name} ·{' '}
            <span className="font-semibold text-ink">{amountDisplay}</span>
            {daysDisplay && <> · {daysDisplay}</>}
          </p>
          {variation.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
              {variation.description}
            </p>
          )}
        </div>
        {canWrite && variation.status === 'proposed' && (
          <button
            type="button"
            onClick={onWithdraw}
            disabled={pending}
            className="rounded-lg border border-hairline px-3 py-1 text-[11px] font-semibold text-ink-muted hover:bg-canvas disabled:opacity-60"
          >
            Withdraw
          </button>
        )}
      </div>

      {variation.status === 'accepted' && (
        <p className="mt-3 rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-2 text-[11px]">
          <span className="font-bold uppercase tracking-wider text-primary">
            Signed
          </span>{' '}
          by {variation.client_signature ?? '—'}
          {variation.decided_at && ` on ${formatDate(variation.decided_at)}`}
        </p>
      )}
      {variation.status === 'proposed' && (
        <p className="mt-3 text-[11px] text-ink-muted">
          Awaiting client signature in the mobile app.
        </p>
      )}
      {error && (
        <div className="mt-2 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
    </li>
  );
}

function ProposeForm({
  projectId,
  suggestedNumber,
  onDone,
}: {
  projectId: string;
  suggestedNumber: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const number = String(fd.get('number') ?? '').trim();
    const title = String(fd.get('title') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim() || null;
    const amountText = String(fd.get('amount') ?? '').trim();
    const amountPence = amountText
      ? Math.round(parseFloat(amountText.replace(/[£,\s]/g, '')) * 100)
      : 0;
    const daysText = String(fd.get('days') ?? '0').trim();
    const days = parseInt(daysText, 10) || 0;

    if (!Number.isFinite(amountPence)) {
      setError('Invalid amount.');
      return;
    }

    startTransition(async () => {
      const res = await proposeVariationOnWeb({
        project_id: projectId,
        number,
        title,
        description,
        delta_amount_gbp_pence: amountPence,
        delta_days: days,
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[1fr_3fr]">
        <Field
          label="Number"
          name="number"
          defaultValue={suggestedNumber}
          required
        />
        <Field
          label="Title"
          name="title"
          placeholder="e.g. Add underfloor heating to en-suite"
          required
        />
      </div>
      <Field
        label="Description (optional)"
        name="description"
        placeholder="What's changing and why"
        textarea
      />
      <div className="grid gap-2 md:grid-cols-2">
        <Field
          label="£ amount (positive = client pays more)"
          name="amount"
          placeholder="e.g. 1840"
          required
        />
        <Field
          label="Programme delta (days, can be negative)"
          name="days"
          defaultValue="0"
          type="number"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Proposing…' : 'Propose variation'}
        </button>
      </div>
    </form>
  );
}

function StatusPill({
  status,
}: {
  status: 'proposed' | 'accepted' | 'rejected' | 'withdrawn';
}) {
  const cls =
    status === 'proposed'
      ? 'bg-accent/10 text-accent-deep'
      : status === 'accepted'
        ? 'bg-primary/10 text-primary'
        : 'bg-canvas text-ink-muted';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  defaultValue,
  textarea,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          rows={2}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      )}
    </label>
  );
}
