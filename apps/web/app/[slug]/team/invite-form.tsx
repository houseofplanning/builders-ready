'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInvitation } from '@/lib/server-actions/invitations';

export function InviteForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get('email') ?? '').trim().toLowerCase(),
      role: String(fd.get('role') ?? 'client'),
    };
    startTransition(async () => {
      const res = await createInvitation(payload);
      if (!res.ok) {
        setError(res.error ?? 'Could not send.');
        return;
      }
      setSuccess(`Invitation emailed to ${payload.email}.`);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Email address
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="person@example.com"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Role
        </span>
        <select
          name="role"
          defaultValue="client"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="client">Client</option>
          <option value="pm">Project Manager</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send invite'}
      </button>

      {error && (
        <div className="md:col-span-3 rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
      {success && (
        <div className="md:col-span-3 rounded-lg border border-success bg-success/5 px-3 py-2 text-xs text-success">
          {success}
        </div>
      )}
    </form>
  );
}
