'use client';

import { useState, useTransition } from 'react';
import { gbp, formatDate, relativeTime } from '@br/shared';
import {
  createInvoiceOnWeb,
  markInvoicePaid,
} from '@/lib/server-actions/invoices';

export interface InvoiceRow {
  id: string;
  number: string;
  title: string;
  description: string | null;
  amount_gbp_pence: number;
  issued_at: string;
  due_at: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  paid_reference: string | null;
}

export function InvoicesSection({
  projectId,
  invoices,
  canWrite,
  suggestedNextNumber,
}: {
  projectId: string;
  invoices: InvoiceRow[];
  canWrite: boolean;
  suggestedNextNumber: string;
}) {
  const [showForm, setShowForm] = useState(false);

  const totals = invoices.reduce(
    (acc, i) => {
      const amt = Number(i.amount_gbp_pence);
      if (i.status === 'paid') acc.paid += amt;
      else if (i.status === 'sent' || i.status === 'overdue') acc.outstanding += amt;
      return acc;
    },
    { paid: 0, outstanding: 0 },
  );

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex items-center px-5 py-3">
        <h2 className="text-sm font-bold">Invoices</h2>
        <span className="ml-2 text-xs text-ink-muted">
          {invoices.length} total ·{' '}
          <span className="font-semibold text-primary">
            {gbp(totals.paid, { whole: true })}
          </span>{' '}
          paid ·{' '}
          <span className="font-semibold text-error">
            {gbp(totals.outstanding, { whole: true })}
          </span>{' '}
          outstanding
        </span>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? 'Cancel' : '+ New invoice'}
          </button>
        )}
      </header>

      {showForm && (
        <div className="border-t border-hairline px-5 py-4">
          <NewInvoiceForm
            projectId={projectId}
            suggestedNumber={suggestedNextNumber}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      <ul className="border-t border-hairline">
        {invoices.length === 0 ? (
          <li className="px-5 py-8 text-center text-xs text-ink-muted">
            No invoices issued yet.
          </li>
        ) : (
          invoices.map((inv) => (
            <InvoiceRowComponent key={inv.id} invoice={inv} canWrite={canWrite} />
          ))
        )}
      </ul>
    </section>
  );
}

function InvoiceRowComponent({
  invoice,
  canWrite,
}: {
  invoice: InvoiceRow;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showMarkPaid, setShowMarkPaid] = useState(false);

  function onMarkPaid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ref = String(fd.get('paid_reference') ?? '').trim() || null;
    setError(null);
    startTransition(async () => {
      const res = await markInvoicePaid({
        invoice_id: invoice.id,
        paid_reference: ref,
      });
      if (!res.ok) {
        setError(res.error ?? 'Failed.');
        return;
      }
      setShowMarkPaid(false);
    });
  }

  const overdue =
    (invoice.status === 'sent' || invoice.status === 'overdue') &&
    new Date(invoice.due_at) < new Date();

  return (
    <li className="border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {invoice.number}
            </span>
            <span className="text-sm font-bold">{invoice.title}</span>
            <StatusPill
              status={invoice.status === 'sent' && overdue ? 'overdue' : invoice.status}
            />
          </div>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            <span className="font-semibold text-ink">
              {gbp(Number(invoice.amount_gbp_pence))}
            </span>{' '}
            · issued {formatDate(invoice.issued_at, { short: true })} · due{' '}
            {formatDate(invoice.due_at, { short: true })}
            {invoice.paid_at && (
              <>
                {' · '}
                paid {relativeTime(invoice.paid_at)}
                {invoice.paid_reference && ` (ref ${invoice.paid_reference})`}
              </>
            )}
          </p>
          {invoice.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
              {invoice.description}
            </p>
          )}
        </div>
        {canWrite &&
          (invoice.status === 'sent' || invoice.status === 'overdue') &&
          !showMarkPaid && (
            <button
              type="button"
              onClick={() => setShowMarkPaid(true)}
              className="rounded-lg border border-primary px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white"
            >
              Mark paid
            </button>
          )}
      </div>

      {showMarkPaid && (
        <form onSubmit={onMarkPaid} className="mt-3 flex items-center gap-2">
          <input
            name="paid_reference"
            placeholder="Bank reference (optional)"
            className="flex-1 rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={() => setShowMarkPaid(false)}
            className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
          >
            Cancel
          </button>
        </form>
      )}
      {error && (
        <div className="mt-2 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
    </li>
  );
}

function NewInvoiceForm({
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

  const today = new Date().toISOString().slice(0, 10);
  const thirty = new Date(Date.now() + 30 * 86400 * 1000)
    .toISOString()
    .slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const number = String(fd.get('number') ?? '').trim();
    const title = String(fd.get('title') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim() || null;
    const amountText = String(fd.get('amount') ?? '').trim();
    const amount_gbp_pence = amountText
      ? Math.round(parseFloat(amountText.replace(/[£,\s]/g, '')) * 100)
      : 0;
    const issued_at = String(fd.get('issued_at') ?? today);
    const due_at = String(fd.get('due_at') ?? thirty);
    const status = String(fd.get('status') ?? 'sent') as 'draft' | 'sent';

    if (amount_gbp_pence <= 0) {
      setError('Amount must be positive.');
      return;
    }

    startTransition(async () => {
      const res = await createInvoiceOnWeb({
        project_id: projectId,
        number,
        title,
        description,
        amount_gbp_pence,
        issued_at,
        due_at,
        status,
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
          placeholder="e.g. Second stage payment"
          required
        />
      </div>
      <Field
        label="Description (optional)"
        name="description"
        placeholder="What this invoice covers"
        textarea
      />
      <div className="grid gap-2 md:grid-cols-3">
        <Field label="£ amount" name="amount" placeholder="e.g. 42750" required />
        <Field
          label="Issued"
          name="issued_at"
          type="date"
          defaultValue={today}
          required
        />
        <Field
          label="Due"
          name="due_at"
          type="date"
          defaultValue={thirty}
          required
        />
      </div>
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Send now or save as draft?
        </span>
        <select
          name="status"
          defaultValue="sent"
          className="block rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="sent">Send to client now</option>
          <option value="draft">Save as draft</option>
        </select>
      </label>

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
          {pending ? 'Creating…' : 'Create invoice'}
        </button>
      </div>
    </form>
  );
}

function StatusPill({
  status,
}: {
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}) {
  const cls =
    status === 'paid'
      ? 'bg-primary/10 text-primary'
      : status === 'overdue'
        ? 'bg-error/10 text-error'
        : status === 'sent'
          ? 'bg-accent/10 text-accent-deep'
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
