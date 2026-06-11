import Link from 'next/link';
import { requireAuth } from '@/lib/tenant-resolver';
import { finishOnboarding } from '@/lib/server-actions/onboarding';
import { InviteForm } from '../../[slug]/team/invite-form';

export default async function InviteStep() {
  await requireAuth();

  return (
    <section className="rounded-card border border-hairline bg-white p-7 shadow-card">
      <h1 className="text-lg font-extrabold">Invite your team</h1>
      <p className="mt-1 text-xs text-ink-muted">
        Add a Project Manager or a Client now, or skip and invite them later
        from the Team page in your dashboard.
      </p>

      <div className="mt-5">
        <InviteForm />
      </div>

      <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4 text-[11px] text-ink-muted">
        <p className="font-semibold text-ink">How invitations work</p>
        <ul className="ml-4 mt-2 list-disc space-y-1">
          <li>
            They receive an email with a link to set their password and
            join your tenant.
          </li>
          <li>
            Project Managers can run projects, post updates and propose
            variations from the web admin and the mobile app.
          </li>
          <li>
            Clients get the mobile-app experience and can accept decisions
            and sign variations on the go.
          </li>
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
            Done — go to dashboard →
          </button>
        </form>
      </div>
    </section>
  );
}
