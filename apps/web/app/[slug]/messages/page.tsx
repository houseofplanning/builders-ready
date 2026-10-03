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

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-10">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-ink">Messages</h1>
      {threads.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-10 text-center text-sm text-ink-muted">
          No messages yet. Message a customer from a job in Find Work.
        </div>
      ) : (
        <ul className="space-y-2">
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
