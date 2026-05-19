import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { AcceptForm } from './accept-form';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ErrorState
        title="No invitation token"
        body="The link you followed doesn't include a token. Double-check the email or ask your builder to resend the invitation."
      />
    );
  }

  // Look up the invitation server-side. We use the admin client because the
  // accepting user isn't yet authenticated and RLS would otherwise hide it.
  const admin = getSupabaseAdmin();
  const { data: invite } = await admin
    .from('invitations')
    .select(
      'id, email, role, expires_at, accepted_at, tenant:tenants(name, brand_primary)',
    )
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return (
      <ErrorState
        title="Invitation not found"
        body="This link is invalid. It may have been revoked or used already. Ask your builder to send a new invitation."
      />
    );
  }

  if (invite.accepted_at) {
    return (
      <ErrorState
        title="Already accepted"
        body="This invitation has already been used. If that was you, sign in with the password you set."
        showSignIn
      />
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return (
      <ErrorState
        title="Invitation expired"
        body="This link expired. Ask your builder to send a new one — it only takes them a moment."
      />
    );
  }

  const tenant = Array.isArray(invite.tenant) ? invite.tenant[0] : invite.tenant;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-card border border-hairline bg-white p-8 shadow-card">
        <div className="mb-6">
          <div className="font-extrabold tracking-[0.2em] text-sm text-center">
            BUILDERS <span className="text-primary">READY</span>
          </div>
        </div>

        <div
          className="mb-5 rounded-card px-4 py-3"
          style={{
            background: tenant?.brand_primary
              ? `${tenant.brand_primary}11`
              : 'rgba(15,76,92,0.07)',
            border: '1px solid var(--br-hairline)',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            You're invited to
          </div>
          <div className="mt-1 text-lg font-extrabold text-ink">
            {tenant?.name ?? 'a project'}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            Joining as <span className="font-semibold text-ink">
              {invite.role === 'pm' ? 'Project Manager' : 'Client'}
            </span>{' '}
            with <span className="font-mono">{invite.email}</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight">
          Finish setting up your account
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          Pick a password and we'll sign you in. Takes about 30 seconds.
        </p>

        <AcceptForm token={token} email={invite.email} />
      </div>
    </main>
  );
}

function ErrorState({
  title,
  body,
  showSignIn,
}: {
  title: string;
  body: string;
  showSignIn?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-card border border-hairline bg-white p-8 text-center shadow-card">
        <div className="mb-6 font-extrabold tracking-[0.2em] text-sm">
          BUILDERS <span className="text-primary">READY</span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{body}</p>
        {showSignIn && (
          <Link
            href="/login"
            className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </main>
  );
}
