import Link from 'next/link';
import { redirect } from 'next/navigation';
import { relativeTime } from '@br/shared';
import { requireCustomer } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';

/**
 * A client's project conversations — one chat thread per project with their
 * builder/PM. With a single project we go straight to its chat; with several
 * we list them. This is where the client "Messages" nav points.
 */
export default async function ClientChatsPage() {
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();

  const { data: projRows } = await supabase
    .from('projects')
    .select('id, name, tenant_id')
    .eq('client_id', me.user_id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });
  const projects = (projRows ?? []) as { id: string; name: string; tenant_id: string }[];

  if (projects.length === 1) {
    redirect(`/me/jobs/${projects[0].id}/chat`);
  }

  // Last message time per project + the builder (trade) name for each.
  const lastMsgAt = new Map<string, string>();
  const tradeName = new Map<string, string>();
  if (projects.length) {
    const [{ data: msgs }, { data: trades }] = await Promise.all([
      supabase
        .from('messages')
        .select('project_id, sent_at')
        .in('project_id', projects.map((p) => p.id))
        .order('sent_at', { ascending: false }),
      supabase
        .from('trades_public')
        .select('id, name')
        .in('id', [...new Set(projects.map((p) => p.tenant_id))]),
    ]);
    (msgs ?? []).forEach((m) => {
      const pid = m.project_id as string;
      if (!lastMsgAt.has(pid)) lastMsgAt.set(pid, m.sent_at as string);
    });
    (trades ?? []).forEach((t) => tradeName.set(t.id as string, t.name as string));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Messages</h1>
      <p className="mt-1 text-sm text-ink-muted">Your conversations with your builder.</p>

      {projects.length === 0 ? (
        <div className="mt-4 rounded-card border border-hairline bg-white p-10 text-center">
          <p className="text-base font-bold text-ink">No conversations yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Once your builder links you to a project, you&rsquo;ll be able to message
            them here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/me/jobs/${p.id}/chat`}
                className="flex items-center justify-between rounded-card border border-hairline bg-white p-5 transition hover:border-primary/40"
              >
                <div>
                  <div className="text-base font-extrabold text-ink">
                    {tradeName.get(p.tenant_id) ?? 'Your builder'}
                  </div>
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
    </div>
  );
}
