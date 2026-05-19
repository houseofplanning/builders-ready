'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/server-actions/projects';

interface Member {
  user_id: string;
  full_name: string;
  role: 'owner' | 'pm' | 'client';
}

interface Props {
  slug: string;
  members: Member[];
  currentUserId: string;
  currentUserRole: 'owner' | 'pm' | 'client';
}

function defaultEndDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 4); // 4-month default project length
  return d.toISOString().slice(0, 10);
}

export function ProjectForm({
  slug,
  members,
  currentUserId,
  currentUserRole,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pmCandidates = members.filter(
    (m) => m.role === 'pm' || m.role === 'owner',
  );
  const clientCandidates = members.filter(
    (m) => m.role === 'client' || m.role === 'owner',
  );

  // If there's no one but the owner, default both PM and client to the
  // current user so the form is fillable end-to-end. Builder can re-assign
  // once they invite real PMs and clients.
  const defaultPmId =
    pmCandidates.find((m) => m.role === 'pm')?.user_id ?? currentUserId;
  const defaultClientId =
    clientCandidates.find((m) => m.role === 'client')?.user_id ?? currentUserId;

  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const quoteText = String(fd.get('quoted_amount') ?? '').trim();
    const quotePence = quoteText
      ? Math.round(parseFloat(quoteText.replace(/[£,\s]/g, '')) * 100)
      : null;

    const payload = {
      name: String(fd.get('name') ?? '').trim(),
      address_line1: String(fd.get('address_line1') ?? '').trim(),
      address_line2: String(fd.get('address_line2') ?? '').trim() || null,
      city: String(fd.get('city') ?? '').trim(),
      postcode: String(fd.get('postcode') ?? '').trim().toUpperCase(),
      client_id: String(fd.get('client_id') ?? ''),
      pm_id: String(fd.get('pm_id') ?? ''),
      start_date: String(fd.get('start_date') ?? ''),
      estimated_end_date: String(fd.get('estimated_end_date') ?? ''),
      quoted_amount_pence:
        quotePence !== null && Number.isFinite(quotePence) && quotePence > 0
          ? quotePence
          : null,
    };
    startTransition(async () => {
      const res = await createProject(payload);
      if (!res.ok || !res.projectId) {
        setError(res.error ?? 'Failed to create project.');
        return;
      }
      router.push(`/${slug}/projects/${res.projectId}`);
    });
  }

  const lonelyTenant = members.length === 1;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {lonelyTenant && (
        <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-xs text-info">
          You&rsquo;re the only person in this tenant right now, so the client and PM dropdowns
          both point at you. Once you invite real PMs and clients (next session), you can
          re-assign them.
        </div>
      )}

      <Field label="Project name" name="name" placeholder="e.g. Hammersmith Townhouse" required />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Address line 1"
          name="address_line1"
          placeholder="42 Larch Road"
          required
        />
        <Field
          label="Address line 2 (optional)"
          name="address_line2"
          placeholder="Flat 1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" name="city" placeholder="London" required />
        <Field label="Postcode" name="postcode" placeholder="W6 9AB" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Project Manager"
          name="pm_id"
          options={pmCandidates}
          defaultValue={defaultPmId}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
        <Select
          label="Client"
          name="client_id"
          options={clientCandidates}
          defaultValue={defaultClientId}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Start date"
          name="start_date"
          type="date"
          defaultValue={today}
          required
        />
        <Field
          label="Estimated end date"
          name="estimated_end_date"
          type="date"
          defaultValue={defaultEndDate()}
          required
        />
      </div>

      <Field
        label="Original quote (£, excl. VAT) — optional"
        name="quoted_amount"
        type="text"
        placeholder="e.g. 285000"
      />
      <p className="-mt-2 text-[11px] text-ink-muted">
        Captured once at project start. Used for the quote-vs-final finance summary and the
        end-of-project handover PDF. Leave blank if not contracted yet.
      </p>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create project'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
  currentUserId,
  currentUserRole,
}: {
  label: string;
  name: string;
  options: Member[];
  defaultValue: string;
  currentUserId: string;
  currentUserRole: 'owner' | 'pm' | 'client';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        {options.length === 0 ? (
          <option value={currentUserId}>You ({currentUserRole})</option>
        ) : (
          options.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
              {m.user_id === currentUserId ? ' (you)' : ''} · {m.role}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
