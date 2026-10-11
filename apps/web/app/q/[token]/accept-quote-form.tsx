'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@br/shared';
import {
  acceptEstimateByToken,
  declineEstimateByToken,
  createClientAccountForQuote,
} from '@/lib/server-actions/estimates';

type Phase = 'actions' | 'signup' | 'declined' | 'done';

export function AcceptQuoteForm({
  token,
  primary,
  builderName,
  status,
  clientName,
  clientEmail,
  signature,
  acceptedAt,
}: {
  token: string;
  primary: string;
  builderName: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  signature: string | null;
  acceptedAt: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(
    status === 'accepted' ? 'signup' : status === 'declined' ? 'declined' : 'actions',
  );
  // Acceptance signature
  const [name, setName] = useState(clientName ?? '');
  const [acceptedBy, setAcceptedBy] = useState<string | null>(signature);
  // Account fields
  const [suName, setSuName] = useState(clientName ?? '');
  const [suEmail, setSuEmail] = useState(clientEmail ?? '');
  const [suPassword, setSuPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onAccept() {
    setError(null);
    if (name.trim().length < 2) {
      setError('Please type your full name to accept.');
      return;
    }
    setBusy(true);
    const res = await acceptEstimateByToken(token, name.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not accept. Please try again.');
      return;
    }
    setAcceptedBy(name.trim());
    if (!suName) setSuName(name.trim());
    setPhase('signup');
  }

  async function onDecline() {
    setError(null);
    if (!window.confirm('Decline this quote? Your builder will be notified.')) return;
    setBusy(true);
    const res = await declineEstimateByToken(token);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not decline. Please try again.');
      return;
    }
    setPhase('declined');
  }

  async function onCreateAccount() {
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await createClientAccountForQuote(token, {
      full_name: suName.trim(),
      email: suEmail.trim(),
      password: suPassword,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not create your account.');
      return;
    }
    if (res.needsSignIn) {
      setInfo('Your project is linked to your account — please sign in to see it.');
      return;
    }
    router.push(res.redirectTo ?? '/me');
  }

  // ---- Accepted, signup dismissed -----------------------------------------
  if (phase === 'done') {
    return (
      <div className="mt-4 rounded-2xl border border-[#B7E3D2] bg-[#E1F5EE] p-5 text-center">
        <div className="text-sm font-extrabold text-[#0F6E56]">
          Quote accepted{acceptedBy ? ` by ${acceptedBy}` : ''}
          {acceptedAt ? ` · ${formatDate(acceptedAt)}` : ''}
        </div>
        <div className="mt-1 text-xs text-ink-muted">
          {builderName} has been notified and will be in touch to get started.
        </div>
      </div>
    );
  }

  // ---- Declined -----------------------------------------------------------
  if (phase === 'declined') {
    return (
      <div className="mt-4 rounded-2xl border border-hairline bg-white p-5 text-center">
        <div className="text-sm font-bold text-ink">Quote declined</div>
        <div className="mt-1 text-xs text-ink-muted">
          No problem — {builderName} has been notified.
        </div>
      </div>
    );
  }

  // ---- Accepted → offer a free account ------------------------------------
  if (phase === 'signup') {
    return (
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-[#B7E3D2] bg-[#E1F5EE] p-5 text-center">
          <div className="text-sm font-extrabold text-[#0F6E56]">
            Quote accepted{acceptedBy ? ` by ${acceptedBy}` : ''}
            {acceptedAt ? ` · ${formatDate(acceptedAt)}` : ''}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {builderName} has been notified.
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-white p-6 shadow-card">
          <h2 className="text-base font-extrabold text-ink">Follow your project</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Create a free account to track progress, see site photos and updates,
            approve any changes, and view invoices — all in one place.{' '}
            <span className="font-semibold text-ink">
              It&apos;s free, and no card is needed.
            </span>{' '}
            Your project will be waiting for you.
          </p>

          <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Your name
          </label>
          <input
            value={suName}
            onChange={(e) => setSuName(e.target.value)}
            placeholder="e.g. Jane Smith"
            className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Email
          </label>
          <input
            type="email"
            value={suEmail}
            onChange={(e) => setSuEmail(e.target.value)}
            placeholder="you@email.com"
            className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Create a password
          </label>
          <input
            type="password"
            value={suPassword}
            onChange={(e) => setSuPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />

          {error && <p className="mt-2 text-xs text-[#B23B1D]">{error}</p>}
          {info && (
            <div className="mt-3 rounded-lg border border-[#B7E3D2] bg-[#E1F5EE] px-3 py-2 text-xs text-[#0F6E56]">
              {info}{' '}
              <Link href="/login" className="font-bold underline">
                Sign in
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={onCreateAccount}
            disabled={busy}
            className="mt-4 w-full rounded-lg px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: primary }}
          >
            {busy ? 'Setting up…' : 'Create account & follow project'}
          </button>
          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted">
            <Link href="/login" className="font-semibold hover:underline">
              Already have an account? Sign in
            </Link>
            <button
              type="button"
              onClick={() => setPhase('done')}
              className="font-semibold hover:underline"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Not yet actioned: Accept / Decline ---------------------------------
  return (
    <div className="mt-4 rounded-2xl border border-hairline bg-white p-6 shadow-card">
      <h2 className="text-base font-extrabold text-ink">Ready to go ahead?</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Accept to confirm you&apos;re happy with the scope and price above —{' '}
        {builderName} will be notified straight away. Type your full name to sign.
      </p>
      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        Your full name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Jane Smith"
        className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
      />
      {error && <p className="mt-2 text-xs text-[#B23B1D]">{error}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="flex-1 rounded-lg px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: primary }}
        >
          {busy ? 'Working…' : 'Accept quote'}
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="rounded-lg border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-muted">
        Accepting records your name and the date as your acceptance.
      </p>
    </div>
  );
}
