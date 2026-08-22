'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createTenantAndOwner } from '@/lib/server-actions/auth';

export default function SignupPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: String(fd.get('full_name') ?? ''),
      business_name: String(fd.get('business_name') ?? ''),
      email: String(fd.get('email') ?? '').trim().toLowerCase(),
      password: String(fd.get('password') ?? ''),
      tier: String(fd.get('tier') ?? 'starter'),
    };
    startTransition(async () => {
      const res = await createTenantAndOwner(payload);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      router.push('/onboarding/billing');
    });
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left — brand panel */}
      <aside className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-[#0F4C5C] via-[#0A3641] to-[#0B1418] px-12 py-12 text-white md:flex">
        <div className="font-extrabold tracking-[0.2em] text-sm">BUILDERS READY</div>
        <div>
          <h2 className="text-2xl font-extrabold leading-snug tracking-tight">
            Your clients deserve better than a WhatsApp group.
          </h2>
          <p className="mt-3 max-w-xs text-sm text-[#9bbfca]">
            Set up your tenant in under 5 minutes. Invite your first PM and your first client
            straight after — they get a branded app on their phone.
          </p>
        </div>
        <div className="border-l-2 border-[#E07A5F] pl-4 text-xs leading-relaxed text-[#cfd8dc]">
          &ldquo;We replaced three different chat threads and a shared Dropbox with one portal.
          Clients stopped phoning at 6pm.&rdquo;
          <div className="mt-2 font-bold text-white">— Pilot builder, West London</div>
        </div>
      </aside>

      {/* Right — form */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold tracking-tight">Start your free trial</h1>
          <p className="mt-1 text-xs text-ink-muted">
            14 days free · Card required to start · No charge until day 15
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <Field label="Your name" name="full_name" placeholder="Jane Smith" required />
            <Field
              label="Business name"
              name="business_name"
              placeholder="e.g. Regal Construction Services Ltd"
              required
            />
            <Field
              label="Work email"
              name="email"
              type="email"
              placeholder="you@yourbuilder.co.uk"
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
            />

            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Plan
              </span>
              <select
                name="tier"
                className="block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
                defaultValue="starter"
              >
                <option value="starter">Starter — £29/mo · up to 10 projects</option>
                <option value="pro">Pro — £69/mo · up to 50 projects</option>
                <option value="unlimited">Unlimited — £149/mo · unlimited projects</option>
              </select>
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
              {pending ? 'Creating your account…' : 'Create account & continue'}
            </button>

            <p className="pt-1 text-[11px] leading-relaxed text-ink-muted">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-primary">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary">
                Privacy Policy
              </Link>
              .
            </p>

            <p className="pt-2 text-center text-xs text-ink-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
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
