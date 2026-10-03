import Link from 'next/link';
import { requireCustomer } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { relativeTime } from '@br/shared';

interface Thread {
  id: string;
  job_request_id: string;
  tenant_id: string;
  last_message_at: string | null;
  created_at: string;
}

export default async function CustomerMessagesPage() {
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from('marketplace_threads')
    .select('id, job_request_id, tenant_id, last_message_at, created_at')
    .eq('customer_id', me.user_id)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  const threads = (data ?? []) as Thread[];

  const admin = getSupabaseAdmin();
  const tradeName = new Map<string, string>();
  const jobTitle = new Map<string, string>();
  if (threads.length) {
    const [{ data: trades }, { data: jobs }] = await Promise.all([
      admin.from('tenants').select('id, name').in('id', [...new Set(threads.map((t) => t.tenant_id))]),
      admin
        .from('job_requests')
        .select('id, title')
        .in('id', [...new Set(threads.map((t) => t.job_request_id))]),
    ]);
    (trades ?? []).forEach((t) => tradeName.set(t.id as string, t.name as string));
    (jobs ?? []).forEach((j) => jobTitle.set(j.id as string, j.title as string));
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-ink">Messages</h1>
      {threads.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-10 text-center text-sm text-ink-muted">
          No messages yet. Trades you&rsquo;re talking to will appear here.
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/me/messages/${t.id}`}
                className="flex items-center justify-between rounded-card border border-hairline bg-white p-4 transition hover:border-primary/40"
              >
                <div>
                  <div className="font-bold text-ink">{tradeName.get(t.tenant_id) ?? 'A trade'}</div>
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
