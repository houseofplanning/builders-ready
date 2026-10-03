'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCustomerAccount } from '@/lib/server-actions/marketplace';

export default function CustomerSignupPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: String(fd.get('full_name') ?? ''),
      email: String(fd.get('email') ?? '').trim().toLowerCase(),
      password: String(fd.get('password') ?? ''),
    };
    startTransition(async () => {
      const res = await createCustomerAccount(payload);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.push(res.redirectTo ?? '/me');
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-sm font-extrabold tracking-[0.2em] text-ink">
          BUILDERS <span className="text-primary">READY</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Post a job — free</h1>
        <p className="mt-1 text-xs text-ink-muted">
          Create your free account and describe what you need. Trades come to you.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Field label="Your name" name="full_name" placeholder="Sarah Whitfield" required />
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="you@email.com"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            required
          />

          {error && (
            <div className="rounded-lg border border-error bg-error/5 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? 'Creating your account…' : 'Create account'}
          </button>

          <p className="pt-2 text-center text-xs text-ink-muted">
            Are you a tradesperson?{' '}
            <Link href="/signup" className="font-semibold text-primary">
              Set up a trade account
            </Link>
          </p>
          <p className="text-center text-xs text-ink-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
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
        autoComplete={type === 'password' ? 'new-password' : 'on'}
        className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}
