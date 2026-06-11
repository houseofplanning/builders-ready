'use client';

import { useState, useTransition } from 'react';
import { gbp, relativeTime } from '@br/shared';
import {
  raiseDecisionOnWeb,
  decideOnWeb,
} from '@/lib/server-actions/decisions';

export interface DecisionListRow {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'accepted' | 'rejected';
  deadline: string | null;
  decided_at: string | null;
  raised_by_name: string;
  decided_by_name: string | null;
  selected_option_id: string | null;
  options: {
    id: string;
    label: string;
    description: string | null;
    price_gbp_pence: number | null;
  }[];
}

export function DecisionsSection({
  projectId,
  decisions,
  canWrite,
}: {
  projectId: string;
  decisions: DecisionListRow[];
  canWrite: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
      <header className="flex items-center px-5 py-3">
        <h2 className="text-sm font-bold">Decisions</h2>
        <span className="ml-2 text-xs text-ink-muted">
          {decisions.length} total
        </span>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? 'Cancel' : '+ Raise decision'}
          </button>
        )}
      </header>

      {showForm && (
        <div className="border-t border-hairline px-5 py-4">
          <RaiseDecisionForm
            projectId={projectId}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      <ul className="border-t border-hairline">
        {decisions.length === 0 ? (
          <li className="px-5 py-8 text-center text-xs text-ink-muted">
            No decisions raised yet.
            {canWrite && ' Click "+ Raise decision" to add the first one.'}
          </li>
        ) : (
          decisions.map((d) => (
            <DecisionRow key={d.id} decision={d} canWrite={canWrite} />
          ))
        )}
      </ul>
    </section>
  );
}

function DecisionRow({
  decision,
  canWrite,
}: {
  decision: DecisionListRow;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const chosen = decision.options.find(
    (o) => o.id === decision.selected_option_id,
  );

  function onAccept(optionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await decideOnWeb({
        decision_id: decision.id,
        outcome: 'accepted',
        selected_option_id: optionId,
      });
      if (!res.ok) setError(res.error ?? 'Failed.');
    });
  }

  function onReject() {
    setError(null);
    startTransition(async () => {
      const res = await decideOnWeb({
        decision_id: decision.id,
        outcome: 'rejected',
        selected_option_id: null,
      });
      if (!res.ok) setError(res.error ?? 'Failed.');
    });
  }

  return (
    <li className="border-b border-hairline px-5 py-4 last:border-b-0">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{decision.title}</span>
            <StatusPill status={decision.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Raised by {decision.raised_by_name}
            {decision.deadline && ` · deadline ${relativeTime(decision.deadline)}`}
          </p>
          {decision.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
              {decision.description}
            </p>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {decision.options.map((o) => {
          const isChosen = o.id === decision.selected_option_id;
          return (
            <li
              key={o.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                isChosen
                  ? 'border-primary bg-primary/5'
                  : 'border-hairline'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{o.label}</div>
                {o.description && (
                  <div className="text-[11px] text-ink-muted">{o.description}</div>
                )}
              </div>
              {o.price_gbp_pence !== null && o.price_gbp_pence !== undefined && (
                <div className="text-xs font-semibold">
                  {gbp(o.price_gbp_pence)}
                </div>
              )}
              {decision.status === 'open' && canWrite && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onAccept(o.id)}
                  className="rounded-lg border border-primary px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60"
                >
                  Accept on behalf
                </button>
              )}
              {isChosen && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Chosen
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {decision.status === 'open' && canWrite && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-ink-muted">
            Client should accept on the mobile app — these buttons are for when
            they tell you over the phone.
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={onReject}
            className="ml-auto rounded-lg border border-hairline px-3 py-1 text-[11px] font-semibold text-ink hover:bg-canvas disabled:opacity-60"
          >
            Mark rejected
          </button>
        </div>
      )}

      {decision.status === 'accepted' && (
        <p className="mt-3 text-[11px] text-ink-muted">
          Accepted by {decision.decided_by_name ?? 'client'}
          {decision.decided_at && ` ${relativeTime(decision.decided_at)}`}
          {chosen && ` — chose ${chosen.label}`}
        </p>
      )}
      {decision.status === 'rejected' && (
        <p className="mt-3 text-[11px] text-ink-muted">
          Rejected
          {decision.decided_at && ` ${relativeTime(decision.decided_at)}`}
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

function RaiseDecisionForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optionCount, setOptionCount] = useState(2);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim() || null;
    const deadline = String(fd.get('deadline') ?? '').trim() || null;

    const options: {
      label: string;
      description: string | null;
      price_gbp_pence: number | null;
    }[] = [];
    for (let i = 0; i < optionCount; i++) {
      const label = String(fd.get(`option_label_${i}`) ?? '').trim();
      if (!label) continue;
      const desc = String(fd.get(`option_description_${i}`) ?? '').trim() || null;
      const priceText = String(fd.get(`option_price_${i}`) ?? '').trim();
      const price = priceText
        ? Math.round(parseFloat(priceText.replace(/[£,\s]/g, '')) * 100)
        : null;
      options.push({
        label,
        description: desc,
        price_gbp_pence:
          price !== null && Number.isFinite(price) && price >= 0 ? price : null,
      });
    }

    if (options.length < 2) {
      setError('At least two options with labels are required.');
      return;
    }

    startTransition(async () => {
      const res = await raiseDecisionOnWeb({
        project_id: projectId,
        title,
        description,
        deadline,
        options,
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
      <Field
        label="Title"
        name="title"
        placeholder="e.g. Splashback tile choice"
        required
      />
      <Field
        label="Description (optional)"
        name="description"
        placeholder="Context the client needs to pick"
        textarea
      />
      <Field label="Deadline (optional)" name="deadline" type="date" />

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Options · {optionCount}
        </div>
        <div className="space-y-2">
          {Array.from({ length: optionCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-hairline bg-canvas p-3"
            >
              <div className="grid gap-2 md:grid-cols-[2fr_3fr_1fr]">
                <input
                  name={`option_label_${i}`}
                  placeholder={`Option ${i + 1} label`}
                  required={i < 2}
                  className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  name={`option_description_${i}`}
                  placeholder="Description (optional)"
                  className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  name={`option_price_${i}`}
                  placeholder="£ price"
                  className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {optionCount < 6 && (
            <button
              type="button"
              onClick={() => setOptionCount((c) => c + 1)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              + Add option
            </button>
          )}
          {optionCount > 2 && (
            <button
              type="button"
              onClick={() => setOptionCount((c) => c - 1)}
              className="text-xs font-semibold text-ink-muted hover:text-ink"
            >
              − Remove last
            </button>
          )}
        </div>
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
          {pending ? 'Raising…' : 'Raise decision'}
        </button>
      </div>
    </form>
  );
}

function StatusPill({ status }: { status: 'open' | 'accepted' | 'rejected' }) {
  const cls =
    status === 'open'
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
  textarea,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
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
          rows={2}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      )}
    </label>
  );
}
