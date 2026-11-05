import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';
import { ConnectForm } from './connect-form';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export const metadata = { title: 'Connect · Builders Ready' };

export default async function ConnectPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ErrorState
        title="No invite token"
        body="The link you followed doesn't include a token. Check the email, or ask the builder to resend the invite."
      />
    );
  }

  // Look up the invite with the admin client — the invitee isn't a member of
  // the inviting tenant, so RLS would otherwise hide it.
  const admin = getSupabaseAdmin();
  const { data: invite } = await admin
    .from('resource_invites')
    .select(
      'status, sent_to, resource:resources(display_name), tenant:tenants(name, brand_primary)',
    )
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return (
      <ErrorState
        title="Invite not found"
        body="This link is invalid. It may have been cancelled or already used. Ask the builder to send a new one."
      />
    );
  }
  if (invite.status === 'accepted') {
    return (
      <ErrorState
        title="Already connected"
        body="This invite has already been used. If that was you, sign in with your password."
        showSignIn
      />
    );
  }
  if (invite.status !== 'pending') {
    return (
      <ErrorState
        title="Invite no longer active"
        body="This invite was cancelled or has expired. Ask the builder to send a new one."
      />
    );
  }

  const tenant = Array.isArray(invite.tenant) ? invite.tenant[0] : invite.tenant;
  const resource = Array.isArray(invite.resource) ? invite.resource[0] : invite.resource;

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const signedIn = Boolean(auth.user);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-card border border-hairline bg-white p-8 shadow-card">
        <div className="mb-6 text-center text-sm font-extrabold tracking-[0.2em]">
          BUILDERS <span className="text-primary">READY</span>
        </div>

        <div
          className="mb-5 rounded-card px-4 py-3"
          style={{
            background: tenant?.brand_primary ? `${tenant.brand_primary}11` : 'rgba(15,76,92,0.07)',
            border: '1px solid var(--br-hairline)',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            You're invited to connect with
          </div>
          <div className="mt-1 text-lg font-extrabold text-ink">{tenant?.name ?? 'a builder'}</div>
          <div className="mt-1 text-xs text-ink-muted">
            They work with you as{' '}
            <span className="font-semibold text-ink">{resource?.display_name ?? 'a team member'}</span>.
          </div>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight">
          {signedIn ? 'Connect your account' : 'Connect to see your jobs'}
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          Once connected you'll see the jobs {tenant?.name ?? 'they'} book you on, with dates and site
          details, and you can confirm when you're coming. It's free.
        </p>

        <ConnectForm
          token={token}
          email={invite.sent_to}
          tenantName={tenant?.name ?? 'the builder'}
          signedIn={signedIn}
        />
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
        <div className="mb-6 text-sm font-extrabold tracking-[0.2em]">
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
