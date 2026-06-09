'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // undefined = still checking, true = recovery session present, false = none.
  const [hasSession, setHasSession] = useState<boolean | undefined>(undefined);

  // The /auth/confirm handler sets a recovery session before sending the
  // user here. If there's no session the link was invalid or expired.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password') ?? '');
    const confirm = String(fd.get('confirm') ?? '');

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    startTransition(async () => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
      // Drop the recovery session so they sign in fresh with the new password.
      await supabase.auth.signOut();
      setTimeout(() => router.push('/login'), 1800);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm rounded-card border border-hairline bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="font-extrabold tracking-[0.2em] text-sm">
            BUILDERS <span className="text-primary">READY</span>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            Choose a new password
          </h1>
        </div>

        {hasSession === false ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
              This reset link is invalid or has expired.
            </div>
            <p className="text-center text-xs text-ink-muted">
              <Link href="/forgot-password" className="font-semibold text-primary">
                Request a new link
              </Link>
            </p>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-hairline bg-canvas px-4 py-3 text-sm text-ink">
              Password updated. Redirecting you to sign in…
            </div>
            <p className="text-center text-xs text-ink-muted">
              <Link href="/login" className="font-semibold text-primary">
                Go to sign in now
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                New password
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
                placeholder="At least 12 characters"
                className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Confirm new password
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
              disabled={pending || hasSession === undefined}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
