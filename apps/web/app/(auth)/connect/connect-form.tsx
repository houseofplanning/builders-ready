'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { acceptConnectionInvite } from '@/lib/server-actions/connections';
import { createCustomerAccount } from '@/lib/server-actions/marketplace';
import { signInAction } from '@/lib/server-actions/auth';

const inputCls =
  'block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none';
const labelCls =
  'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted';

export function ConnectForm({
  token,
  email,
  tenantName,
  signedIn,
}: {
  token: string;
  email: string;
  tenantName: string;
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');

  function finishConnect() {
    startTransition(async () => {
      const res = await acceptConnectionInvite(token);
      if (!res.ok) {
        setError(res.error ?? 'Could not connect.');
        return;
      }
      setDone(true);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password') ?? '');

    startTransition(async () => {
      if (mode === 'new') {
        const full_name = String(fd.get('full_name') ?? '').trim();
        const acc = await createCustomerAccount({ full_name, email, password });
        if (!acc.ok) {
          setError(acc.error ?? 'Could not create your account.');
          return;
        }
      } else {
        const signin = await signInAction({ email, password });
        if (!signin.ok) {
          setError(signin.error ?? 'Email or password is incorrect.');
          return;
        }
      }
      const res = await acceptConnectionInvite(token);
      if (!res.ok) {
        setError(res.error ?? 'Could not connect.');
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="mt-6 rounded-card border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="text-base font-extrabold text-emerald-800">You're connected</div>
        <p className="mt-1 text-sm text-emerald-700">
          You're now connected to {tenantName}. Open the Builders Ready app to see the jobs they book
          you on and confirm when you're coming.
        </p>
        <Link
          href="/me"
          className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
        >
          Open Builders Ready
        </Link>
      </div>
    );
  }

  // Already signed in — one tap to connect.
  if (signedIn) {
    return (
      <div className="mt-6 space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={finishConnect}
          disabled={pending}
          className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? 'Connecting…' : `Connect with ${tenantName}`}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex rounded-lg border border-hairline p-0.5 text-sm">
        <button
          type="button"
          onClick={() => { setMode('new'); setError(null); }}
          className={`flex-1 rounded-md px-3 py-1.5 font-semibold ${mode === 'new' ? 'bg-primary text-white' : 'text-ink-muted'}`}
        >
          I'm new
        </button>
        <button
          type="button"
          onClick={() => { setMode('existing'); setError(null); }}
          className={`flex-1 rounded-md px-3 py-1.5 font-semibold ${mode === 'existing' ? 'bg-primary text-white' : 'text-ink-muted'}`}
        >
          I have an account
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className={labelCls}>Email</span>
          <input
            value={email}
            readOnly
            className="block w-full rounded-lg border border-hairline bg-canvas px-3 py-2 font-mono text-sm text-ink-muted"
          />
        </label>

        {mode === 'new' && (
          <label className="block">
            <span className={labelCls}>Your full name</span>
            <input name="full_name" autoComplete="name" required minLength={2} maxLength={120} className={inputCls} />
          </label>
        )}

        <label className="block">
          <span className={labelCls}>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            className={inputCls}
          />
          {mode === 'new' && (
            <span className="mt-1 block text-[11px] text-ink-muted">At least 8 characters.</span>
          )}
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? 'Connecting…' : mode === 'new' ? 'Create account & connect' : 'Sign in & connect'}
        </button>
      </form>

      {mode === 'existing' && (
        <p className="mt-3 text-center text-[11px] text-ink-muted">
          Forgot your password? <Link href="/forgot-password" className="font-semibold text-primary">Reset it</Link>
        </p>
      )}
    </div>
  );
}
