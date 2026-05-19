import { notFound, redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@br/shared';
import { InviteForm } from './invite-form';
import { RevokeButton } from './revoke-button';

interface Props {
  params: Promise<{ slug: string }>;
}

interface MemberRow {
  user_id: string;
  role: 'owner' | 'pm' | 'client';
  joined_at: string;
  profile: { id: string; full_name: string; email: string } | null;
}

interface InvitationRow {
  id: string;
  email: string;
  role: 'pm' | 'client';
  created_at: string;
  expires_at: string;
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') {
    redirect(`/${slug}/dashboard`);
  }
  const supabase = await createSupabaseServer();

  const [{ data: rawMembers }, { data: rawInvitations }] = await Promise.all([
    supabase
      .from('tenant_members')
      .select(
        'user_id, role, joined_at, profile:profiles!tenant_members_user_id_fkey(id, full_name, email)',
      )
      .eq('tenant_id', tenant.id),
    supabase
      .from('invitations')
      .select('id, email, role, created_at, expires_at')
      .eq('tenant_id', tenant.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ]);

  const members: MemberRow[] = (rawMembers ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: Array.isArray(m.profile) ? m.profile[0] : (m.profile ?? null),
  }));
  const invitations: InvitationRow[] = (rawInvitations ?? []) as InvitationRow[];

  // Sort: owner first, then PMs, then clients
  const roleOrder = { owner: 0, pm: 1, client: 2 } as const;
  members.sort(
    (a, b) =>
      roleOrder[a.role] - roleOrder[b.role] ||
      a.joined_at.localeCompare(b.joined_at),
  );

  if (!tenant) notFound();

  return (
    <div>
      <header className="mb-6 flex items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Tenant · {tenant.name}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Team</h1>
        </div>
      </header>

      {/* INVITE FORM */}
      <section className="rounded-card border border-hairline bg-white p-6 shadow-card">
        <h2 className="text-base font-bold">Invite someone</h2>
        <p className="mt-1 text-xs text-ink-muted">
          They&apos;ll get an email with a link to set their password. Project
          Managers can post updates and run their projects; Clients get the
          mobile-app experience.
        </p>
        <div className="mt-4">
          <InviteForm />
        </div>
      </section>

      {/* PENDING INVITATIONS */}
      {invitations.length > 0 && (
        <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
          <header className="border-b border-hairline px-5 py-3">
            <h2 className="text-sm font-bold">
              Pending invitations · {invitations.length}
            </h2>
          </header>
          <ul>
            {invitations.map((inv, i) => (
              <li
                key={inv.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i > 0 ? 'border-t border-hairline' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{inv.email}</div>
                  <div className="text-[11px] text-ink-muted">
                    {inv.role === 'pm' ? 'Project Manager' : 'Client'}
                    {' · '}
                    sent {formatDate(inv.created_at, { short: true })}
                    {' · '}
                    expires {formatDate(inv.expires_at, { short: true })}
                  </div>
                </div>
                <RevokeButton invitationId={inv.id} email={inv.email} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* MEMBERS */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
        <header className="border-b border-hairline px-5 py-3">
          <h2 className="text-sm font-bold">Members · {members.length}</h2>
        </header>
        <ul>
          {members.map((m, i) => (
            <li
              key={m.user_id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i > 0 ? 'border-t border-hairline' : ''
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary text-sm font-extrabold tracking-widest">
                {(m.profile?.full_name ?? '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink">
                  {m.profile?.full_name ?? '—'}
                </div>
                <div className="text-[11px] text-ink-muted">
                  {m.profile?.email ?? '—'}
                  {' · '}
                  joined {formatDate(m.joined_at, { short: true })}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  m.role === 'owner'
                    ? 'bg-primary/10 text-primary'
                    : m.role === 'pm'
                      ? 'bg-accent/10 text-accent-deep'
                      : 'bg-canvas text-ink-muted'
                }`}
              >
                {m.role === 'owner' ? 'Owner' : m.role === 'pm' ? 'PM' : 'Client'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
