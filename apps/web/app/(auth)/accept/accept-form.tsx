'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation } from '@/lib/server-actions/invitations';

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      token,
      full_name: String(fd.get('full_name') ?? '').trim(),
      password: String(fd.get('password') ?? ''),
    };
    const confirm = String(fd.get('confirm') ?? '');
    if (payload.password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const res = await acceptInvitation(payload);
      if (!res.ok || !res.redirectTo) {
        setError(res.error ?? 'Could not accept.');
        return;
      }
      router.push(res.redirectTo);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Email
        </span>
        <input
          value={email}
          readOnly
          className="block w-full rounded-lg border border-hairline bg-canvas px-3 py-2 font-mono text-sm text-ink-muted"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Your full name
        </span>
        <input
          name="full_name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Pick a password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          placeholder="At least 8 characters"
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Confirm password
        </span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
          className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Creating your account…' : 'Accept invitation & continue'}
      </button>

      <p className="pt-1 text-[11px] leading-relaxed text-ink-muted">
        By accepting you agree to our Terms and Privacy Policy.
      </p>
    </form>
  );
}
