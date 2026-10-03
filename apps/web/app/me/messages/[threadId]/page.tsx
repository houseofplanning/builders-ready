import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ChatBox } from '@/components/marketplace/chat-box';
import { MessageThread } from '@/components/marketplace/message-thread';

interface Props {
  params: Promise<{ threadId: string }>;
}

export default async function CustomerThreadPage({ params }: Props) {
  const { threadId } = await params;
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();

  const { data: thread } = await supabase
    .from('marketplace_threads')
    .select('id, job_request_id, tenant_id, customer_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread || thread.customer_id !== me.user_id) notFound();

  const { data: messages } = await supabase
    .from('marketplace_messages')
    .select('id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const admin = getSupabaseAdmin();
  const [{ data: trade }, { data: job }] = await Promise.all([
    admin.from('tenants').select('name').eq('id', thread.tenant_id).maybeSingle(),
    admin.from('job_requests').select('title').eq('id', thread.job_request_id).maybeSingle(),
  ]);

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <Link href="/me/messages" className="text-sm font-bold text-primary hover:underline">
        ‹ Messages
      </Link>
      <div className="mb-2 mt-2 border-b border-hairline pb-2">
        <div className="font-extrabold text-ink">{trade?.name ?? 'A trade'}</div>
        <div className="text-xs text-ink-muted">{job?.title ?? 'Job'}</div>
      </div>
      <MessageThread messages={messages ?? []} meId={me.user_id} />
      <div className="pt-3">
        <ChatBox threadId={threadId} />
      </div>
    </div>
  );
}
