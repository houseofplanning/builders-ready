import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete your account · Builders Ready',
  description:
    'How to request deletion of your Builders Ready account and associated data, what is removed, and what is retained.',
};

const CONTACT_EMAIL = 'info@buildersready.uk';
const LAST_UPDATED = '9 June 2026';

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-muted">
          BUILDERS READY
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Delete your account
        </h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>
      </header>

      <article className="prose-content space-y-6 text-sm leading-relaxed text-ink">
        <section>
          <p>
            This page explains how to request deletion of your <strong>Builders Ready</strong>{' '}
            account and the personal data associated with it, what is deleted, and what we are
            required to keep.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">How to request deletion</h2>
          <ol className="list-decimal space-y-1 pl-6">
            <li>
              Email <strong>{CONTACT_EMAIL}</strong> from the email address linked to your
              Builders Ready account.
            </li>
            <li>
              Use the subject line <strong>&quot;Delete my account&quot;</strong>.
            </li>
            <li>
              We will verify that you own the account, action the request, and email you to
              confirm once it is complete.
            </li>
          </ol>
          <p>
            We respond to and complete verified deletion requests within <strong>30 days</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">What gets deleted</h2>
          <p>On a verified request we permanently delete:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Your profile (name and email address) and login credentials</li>
            <li>Photos, messages and project content associated with your account</li>
            <li>Push-notification tokens and device identifiers</li>
            <li>Crash and diagnostic data linked to your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">What we keep, and for how long</h2>
          <p>
            Some data must be retained to meet legal obligations or to protect against re-contact.
            We keep only the following, and only for the stated period:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Invoicing and financial records</strong> — 6 years after the end of the
              relevant financial year, as required by HMRC.
            </li>
            <li>
              <strong>Backups</strong> — overwritten on a rolling 7–30 day cycle, after which the
              deleted data is no longer recoverable.
            </li>
            <li>
              <strong>Marketing suppression record</strong> — if you previously unsubscribed, we
              retain a minimal suppression record so we do not accidentally re-contact you.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">Questions</h2>
          <p>
            If you have any questions about deleting your account or your data, email us at{' '}
            <strong>{CONTACT_EMAIL}</strong>.
          </p>
        </section>
      </article>
    </main>
  );
}
