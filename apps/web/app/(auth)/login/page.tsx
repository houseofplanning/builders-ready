'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInAction } from '@/lib/server-actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get('email') ?? '').trim().toLowerCase(),
      password: String(fd.get('password') ?? ''),
    };
    startTransition(async () => {
      const res = await signInAction(payload);
      if (!res.ok || !res.redirectTo) {
        setError(res.error ?? 'Sign-in failed.');
        return;
      }
      router.push(res.redirectTo);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-card border border-hairline bg-white p-8 shadow-card sm:p-10">
        <div className="mb-8 text-center">
          <div className="text-sm font-extrabold tracking-[0.2em]">
            BUILDERS <span className="text-primary">READY</span>
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-muted">Sign in to your account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="block w-full rounded-lg border border-hairline bg-white px-4 py-3 text-base focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="block w-full rounded-lg border border-hairline bg-white px-4 py-3 text-base focus:border-primary focus:outline-none"
            />
          </label>

          <div className="text-right">
            <Link href="/forgot-password" className="text-xs font-semibold text-primary">
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-primary px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="space-y-1.5 pt-3 text-center text-sm text-ink-muted">
            <p>
              Need a trade?{' '}
              <Link href="/signup/customer" className="font-semibold text-primary">
                Post a job
              </Link>
            </p>
            <p>
              Are you a tradesperson?{' '}
              <Link href="/signup" className="font-semibold text-primary">
                Start a trial
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
