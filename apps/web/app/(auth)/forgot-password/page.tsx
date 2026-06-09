'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // The /auth/confirm handler bounces invalid/expired links back here with
  // ?error=expired. Read it from the URL directly to avoid needing a
  // useSearchParams Suspense boundary.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'expired') {
      setError('That reset link was invalid or has expired. Request a new one below.');
    }
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '')
      .trim()
      .toLowerCase();

    startTransition(async () => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });

      // Surface rate-limiting so people aren't left wondering, but otherwise
      // always show the same confirmation — we never reveal whether an
      // account exists for a given email.
      if (error?.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
        return;
      }
      setSent(true);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm rounded-card border border-hairline bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="font-extrabold tracking-[0.2em] text-sm">
            BUILDERS <span className="text-primary">READY</span>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-xs text-ink-muted">
            We&apos;ll email you a secure link to set a new one
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-hairline bg-canvas px-4 py-3 text-sm text-ink">
              If an account exists for that email, a reset link is on its way.
              Check your inbox (and spam folder) and follow the link to choose a
              new password.
            </div>
            <p className="text-center text-xs text-ink-muted">
              <Link href="/login" className="font-semibold text-primary">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Email
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
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
              {pending ? 'Sending link…' : 'Send reset link'}
            </button>

            <p className="pt-2 text-center text-xs text-ink-muted">
              Remembered it?{' '}
              <Link href="/login" className="font-semibold text-primary">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
