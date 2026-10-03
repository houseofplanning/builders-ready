import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ChatBox } from '@/components/marketplace/chat-box';
import { MessageThread } from '@/components/marketplace/message-thread';

interface Props {
  params: Promise<{ slug: string; threadId: string }>;
}

export default async function TradeThreadPage({ params }: Props) {
  const { slug, threadId } = await params;
  const { tenant, user_id } = await requireTenantBySlug(slug);
  const supabase = await createSupabaseServer();

  const { data: thread } = await supabase
    .from('marketplace_threads')
    .select('id, job_request_id, tenant_id, customer_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread || thread.tenant_id !== tenant.id) notFound();

  const { data: messages } = await supabase
    .from('marketplace_messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const admin = getSupabaseAdmin();
  const [{ data: customer }, { data: job }] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', thread.customer_id).maybeSingle(),
    admin.from('job_requests').select('title').eq('id', thread.job_request_id).maybeSingle(),
  ]);
  const firstName = customer?.full_name?.split(/\s+/)[0] ?? 'Customer';

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-2xl flex-col px-6 py-6 lg:px-10">
      <Link href={`/${slug}/messages`} className="text-sm font-bold text-primary hover:underline">
        ‹ Messages
      </Link>
      <div className="mb-2 mt-2 border-b border-hairline pb-2">
        <div className="font-extrabold text-ink">{firstName}</div>
        <div className="text-xs text-ink-muted">{job?.title ?? 'Job'}</div>
      </div>
      <MessageThread messages={messages ?? []} meId={user_id} />
      <div className="pt-3">
        <ChatBox threadId={threadId} />
      </div>
    </div>
  );
}
