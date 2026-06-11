import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@br/shared';
import { InviteForm } from './invite-form';
import { RevokeButton } from './revoke-button';
import { ReassignControl } from './reassign-controls';

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

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  client_id: string | null;
  pm_id: string | null;
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  if (role !== 'owner' && role !== 'pm') {
    redirect(`/${slug}/dashboard`);
  }
  const supabase = await createSupabaseServer();

  // 1. Fetch members, invitations, and projects in parallel.
  const [{ data: rawMembers }, { data: rawInvitations }, { data: rawProjects }] =
    await Promise.all([
      supabase
        .from('tenant_members')
        .select('user_id, role, joined_at')
        .eq('tenant_id', tenant.id),
      supabase
        .from('invitations')
        .select('id, email, role, created_at, expires_at')
        .eq('tenant_id', tenant.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name, status, client_id, pm_id')
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
    ]);

  // 2. Resolve profile names for every member id.
  const userIds = (rawMembers ?? []).map((m) => m.user_id);
  const { data: profileRows } = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
    : { data: [] as { id: string; full_name: string; email: string }[] };
  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id, p]),
  );

  const members: MemberRow[] = (rawMembers ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: profileById.get(m.user_id) ?? null,
  }));
  const invitations: InvitationRow[] = (rawInvitations ?? []) as InvitationRow[];
  const projects: ProjectRow[] = (rawProjects ?? []) as ProjectRow[];

  // 3. Bucket members by role group + bucket projects per member.
  const teamMembers = members.filter(
    (m) => m.role === 'owner' || m.role === 'pm',
  );
  const clientMembers = members.filter((m) => m.role === 'client');

  const projectsByPm = new Map<string, ProjectRow[]>();
  for (const p of projects) {
    if (!p.pm_id) continue;
    const list = projectsByPm.get(p.pm_id) ?? [];
    list.push(p);
    projectsByPm.set(p.pm_id, list);
  }

  const projectsByClient = new Map<string, ProjectRow[]>();
  for (const p of projects) {
    if (!p.client_id) continue;
    const list = projectsByClient.get(p.client_id) ?? [];
    list.push(p);
    projectsByClient.set(p.client_id, list);
  }

  // 4. Candidate lists for the reassign dropdowns.
  const pmCandidates = teamMembers
    .filter((m) => !!m.profile)
    .map((m) => ({ user_id: m.user_id, full_name: m.profile!.full_name }));
  const clientCandidates = clientMembers
    .filter((m) => !!m.profile)
    .map((m) => ({ user_id: m.user_id, full_name: m.profile!.full_name }));

  // 5. Sort each section: owner first (in Team members), then by joined date.
  const teamRoleOrder = { owner: 0, pm: 1 } as const;
  teamMembers.sort(
    (a, b) =>
      (teamRoleOrder[a.role as 'owner' | 'pm'] ?? 99) -
        (teamRoleOrder[b.role as 'owner' | 'pm'] ?? 99) ||
      a.joined_at.localeCompare(b.joined_at),
  );
  clientMembers.sort((a, b) => a.joined_at.localeCompare(b.joined_at));

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
                <div className="min-w-0 flex-1">
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

      {/* TEAM MEMBERS — owners + PMs */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
        <header className="border-b border-hairline px-5 py-3">
          <h2 className="text-sm font-bold">
            Team members · {teamMembers.length}
          </h2>
          <p className="mt-1 text-[11px] text-ink-muted">
            Owners and Project Managers. Each project below the PM&apos;s name
            can be reassigned to a different owner or PM.
          </p>
        </header>
        <ul>
          {teamMembers.map((m, i) => {
            const memberProjects = projectsByPm.get(m.user_id) ?? [];
            return (
              <li
                key={m.user_id}
                className={`px-5 py-4 ${i > 0 ? 'border-t border-hairline' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <Initials name={m.profile?.full_name ?? '?'} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">
                      {m.profile?.full_name ?? '—'}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {m.profile?.email ?? '—'}
                      {' · '}
                      joined {formatDate(m.joined_at, { short: true })}
                    </div>
                  </div>
                  <RolePill role={m.role} />
                </div>
                {memberProjects.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-l border-hairline pl-4">
                    {memberProjects.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1"
                      >
                        <Link
                          href={`/${slug}/projects/${p.id}`}
                          className="text-xs font-semibold text-ink hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
                          {p.status.replace('_', ' ')}
                        </span>
                        <ReassignControl
                          kind="pm"
                          projectId={p.id}
                          currentUserId={m.user_id}
                          candidates={pmCandidates}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 border-l border-hairline pl-4 text-[11px] italic text-ink-muted">
                    No projects assigned to {m.profile?.full_name ?? 'them'}.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* CLIENTS */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
        <header className="border-b border-hairline px-5 py-3">
          <h2 className="text-sm font-bold">
            Clients · {clientMembers.length}
          </h2>
          <p className="mt-1 text-[11px] text-ink-muted">
            Each client&apos;s projects are listed below them. Use Reassign
            client if a project is pointing at the wrong person.
          </p>
        </header>
        {clientMembers.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-ink-muted">
            No clients yet. Invite one above and they&apos;ll appear here once
            they accept.
          </p>
        ) : (
          <ul>
            {clientMembers.map((m, i) => {
              const memberProjects = projectsByClient.get(m.user_id) ?? [];
              return (
                <li
                  key={m.user_id}
                  className={`px-5 py-4 ${i > 0 ? 'border-t border-hairline' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <Initials name={m.profile?.full_name ?? '?'} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">
                        {m.profile?.full_name ?? '—'}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {m.profile?.email ?? '—'}
                        {' · '}
                        joined {formatDate(m.joined_at, { short: true })}
                      </div>
                    </div>
                    <RolePill role="client" />
                  </div>
                  {memberProjects.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-l border-hairline pl-4">
                      {memberProjects.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1"
                        >
                          <Link
                            href={`/${slug}/projects/${p.id}`}
                            className="text-xs font-semibold text-ink hover:underline"
                          >
                            {p.name}
                          </Link>
                          <span className="text-[10px] uppercase tracking-wider text-ink-muted">
                            {p.status.replace('_', ' ')}
                          </span>
                          <ReassignControl
                            kind="client"
                            projectId={p.id}
                            currentUserId={m.user_id}
                            candidates={clientCandidates}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 border-l border-hairline pl-4 text-[11px] italic text-ink-muted">
                      No projects assigned to {m.profile?.full_name ?? 'them'}.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* PROJECTS NEEDING ATTENTION
          Three failure modes worth surfacing:
            1. client_id == pm_id    — almost always the lonely-tenant
               default that nobody fixed after inviting the real client
            2. client_id or pm_id NULL — never happens with our create
               form but defensive
            3. client_id or pm_id pointing at a user no longer in the tenant */}
      {(() => {
        const profileByMember = new Map(
          members.map((m) => [m.user_id, m]),
        );
        const issues = projects
          .map((p) => {
            const issue: {
              project: ProjectRow;
              reasons: string[];
            } = { project: p, reasons: [] };
            if (!p.client_id || !p.pm_id) {
              issue.reasons.push('Missing PM or Client.');
            }
            if (
              p.client_id &&
              p.pm_id &&
              p.client_id === p.pm_id
            ) {
              const same = profileByMember.get(p.client_id);
              issue.reasons.push(
                `Client and PM are both ${same?.profile?.full_name ?? 'the same person'} — reassign the real client below.`,
              );
            }
            if (p.client_id && !profileByMember.has(p.client_id)) {
              issue.reasons.push('Client is no longer a tenant member.');
            }
            if (p.pm_id && !profileByMember.has(p.pm_id)) {
              issue.reasons.push('PM is no longer a tenant member.');
            }
            return issue;
          })
          .filter((i) => i.reasons.length > 0);

        if (issues.length === 0) return null;
        return (
          <section className="mt-6 rounded-card border border-warning bg-warning/5 p-5 shadow-card">
            <h2 className="text-sm font-bold text-warning">
              Projects needing attention · {issues.length}
            </h2>
            <p className="mt-1 text-[11px] text-ink-muted">
              Fix these inline below. Each project shows who&apos;s currently
              assigned — use Reassign to point it at the right person.
            </p>
            <ul className="mt-4 space-y-4">
              {issues.map(({ project, reasons }) => {
                const currentClient = project.client_id
                  ? profileByMember.get(project.client_id)
                  : null;
                const currentPm = project.pm_id
                  ? profileByMember.get(project.pm_id)
                  : null;
                return (
                  <li
                    key={project.id}
                    className="rounded-lg border border-hairline bg-white p-4"
                  >
                    <Link
                      href={`/${slug}/projects/${project.id}`}
                      className="text-sm font-bold text-ink hover:underline"
                    >
                      {project.name}
                    </Link>
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-warning">
                      {reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-2 border-t border-hairline pt-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[11px] text-ink-muted">
                          Client:
                        </span>
                        <span className="text-xs font-semibold text-ink">
                          {currentClient?.profile?.full_name ?? '— none —'}
                          {currentClient && currentClient.role !== 'client'
                            ? ` (currently a ${currentClient.role})`
                            : ''}
                        </span>
                        {project.client_id && (
                          <ReassignControl
                            kind="client"
                            projectId={project.id}
                            currentUserId={project.client_id}
                            candidates={clientCandidates}
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[11px] text-ink-muted">
                          PM:
                        </span>
                        <span className="text-xs font-semibold text-ink">
                          {currentPm?.profile?.full_name ?? '— none —'}
                        </span>
                        {project.pm_id && (
                          <ReassignControl
                            kind="pm"
                            projectId={project.id}
                            currentUserId={project.pm_id}
                            candidates={pmCandidates}
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}
    </div>
  );
}

function Initials({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-extrabold tracking-widest text-primary">
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()}
    </div>
  );
}

function RolePill({ role }: { role: 'owner' | 'pm' | 'client' }) {
  const cls =
    role === 'owner'
      ? 'bg-primary/10 text-primary'
      : role === 'pm'
        ? 'bg-accent/10 text-accent-deep'
        : 'bg-canvas text-ink-muted';
  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {role === 'owner' ? 'Owner' : role === 'pm' ? 'PM' : 'Client'}
    </span>
  );
}
