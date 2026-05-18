import Link from 'next/link';
import { requireAuth } from '@/lib/tenant-resolver';
import { finishOnboarding } from '@/lib/server-actions/onboarding';

export default async function InviteStep() {
  await requireAuth();

  return (
    <section className="rounded-card border border-hairline bg-white p-7 shadow-card">
      <h1 className="text-lg font-extrabold">Invite your team</h1>
      <p className="mt-1 text-xs text-ink-muted">
        Email-link invitations land in the next session — Resend needs DNS records on{' '}
        <code>buildersready.uk</code> first. For now, jump to your dashboard and explore.
      </p>

      <div className="mt-6 rounded-lg border border-hairline bg-canvas p-5 text-xs text-ink-muted">
        <p className="font-semibold text-ink">Coming next session</p>
        <ul className="ml-4 mt-2 list-disc space-y-1">
          <li>Add PMs by email — they receive a magic link to set their password</li>
          <li>Add clients the same way; they get the mobile app on their phone</li>
          <li>Resend the link or revoke an invitation any time</li>
        </ul>
      </div>

      <div className="mt-6 flex justify-between">
        <Link
          href="/onboarding/bank"
          className="rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-ink"
        >
          ← Back
        </Link>
        <form action={finishOnboarding}>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Skip and go to dashboard →
          </button>
        </form>
      </div>
    </section>
  );
}
