import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { relativeTime } from '@br/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

interface Thread {
  id: string;
  job_request_id: string;
  customer_id: string;
  last_message_at: string | null;
}

export default async function TradeMessagesPage({ params }: Props) {
  const { slug } = await params;
  const { tenant } = await requireTenantBySlug(slug);
  const supabase = await createSupabaseServer();

  const { data } = await supabase
    .from('marketplace_threads')
    .select('id, job_request_id, customer_id, last_message_at')
    .eq('tenant_id', tenant.id)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  const threads = (data ?? []) as Thread[];

  const admin = getSupabaseAdmin();
  const name = new Map<string, string>();
  const jobTitle = new Map<string, string>();
  if (threads.length) {
    const [{ data: people }, { data: jobs }] = await Promise.all([
      admin.from('profiles').select('id, full_name').in('id', [...new Set(threads.map((t) => t.customer_id))]),
      admin
        .from('job_requests')
        .select('id, title')
        .in('id', [...new Set(threads.map((t) => t.job_request_id))]),
    ]);
    (people ?? []).forEach((p) =>
      name.set(p.id as string, (p.full_name as string)?.split(/\s+/)[0] ?? 'Customer'),
    );
    (jobs ?? []).forEach((j) => jobTitle.set(j.id as string, j.title as string));
  }

  // Project conversations — the client↔PM chat on each project (the `messages`
  // thread). Previously only reachable in the app; this is the web window on it.
  const { data: projRows } = await supabase
    .from('projects')
    .select('id, name, client_id')
    .eq('tenant_id', tenant.id)
    .neq('status', 'archived')
    .not('client_id', 'is', null)
    .order('updated_at', { ascending: false });
  const projects = (projRows ?? []) as { id: string; name: string; client_id: string }[];

  const lastMsgAt = new Map<string, string>();
  const clientFirst = new Map<string, string>();
  if (projects.length) {
    const projectIds = projects.map((p) => p.id);
    const [{ data: msgs }, { data: clients }] = await Promise.all([
      supabase
        .from('messages')
        .select('project_id, sent_at')
        .in('project_id', projectIds)
        .order('sent_at', { ascending: false }),
      admin
        .from('profiles')
        .select('id, full_name')
        .in('id', [...new Set(projects.map((p) => p.client_id))]),
    ]);
    (msgs ?? []).forEach((m) => {
      const pid = m.project_id as string;
      if (!lastMsgAt.has(pid)) lastMsgAt.set(pid, m.sent_at as string);
    });
    (clients ?? []).forEach((c) =>
      clientFirst.set(c.id as string, (c.full_name as string)?.split(/\s+/)[0] ?? 'Client'),
    );
  }

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-ink">Messages</h1>

      <h2 className="mb-3 text-sm font-bold text-ink">Project conversations</h2>
      {projects.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-6 text-center text-sm text-ink-muted">
          No projects with a client yet. Assign a client to a project to start a conversation.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${slug}/projects/${p.id}/chat`}
                className="flex items-center justify-between rounded-card border border-hairline bg-white p-4 transition hover:border-primary/40"
              >
                <div>
                  <div className="font-bold text-ink">{clientFirst.get(p.client_id) ?? 'Client'}</div>
                  <div className="text-sm text-ink-muted">{p.name}</div>
                </div>
                <span className="text-xs text-ink-muted">
                  {lastMsgAt.has(p.id) ? relativeTime(lastMsgAt.get(p.id)!) : 'New'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-sm font-bold text-ink">Marketplace</h2>
      {threads.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-10 text-center text-sm text-ink-muted">
          No marketplace messages yet. Message a customer from a job in the Marketplace.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/${slug}/messages/${t.id}`}
                className="flex items-center justify-between rounded-card border border-hairline bg-white p-4 transition hover:border-primary/40"
              >
                <div>
                  <div className="font-bold text-ink">{name.get(t.customer_id) ?? 'Customer'}</div>
                  <div className="text-sm text-ink-muted">{jobTitle.get(t.job_request_id) ?? 'Job'}</div>
                </div>
                <span className="text-xs text-ink-muted">
                  {t.last_message_at ? relativeTime(t.last_message_at) : 'New'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
