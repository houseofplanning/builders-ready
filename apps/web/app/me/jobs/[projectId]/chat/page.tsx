import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { MessageThread } from '@/components/marketplace/message-thread';
import { ProjectChatBox } from '@/components/project-chat-box';

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectChatPage({ params }: Props) {
  const { projectId } = await params;
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, tenant_id, client_id, pm_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project || project.client_id !== me.user_id) notFound();

  const { data: rawMessages } = await supabase
    .from('messages')
    .select('id, sender_id, body, sent_at')
    .eq('project_id', projectId)
    .order('sent_at', { ascending: true });

  // MessageThread expects `created_at`; the project thread uses `sent_at`.
  const messages = (rawMessages ?? []).map((m) => ({
    id: m.id as string,
    sender_id: m.sender_id as string,
    body: m.body as string,
    created_at: m.sent_at as string,
  }));

  // Who the client is talking to — the builder (tenant) and the PM's name.
  const admin = getSupabaseAdmin();
  const [{ data: tenant }, { data: pm }] = await Promise.all([
    admin.from('tenants').select('name').eq('id', project.tenant_id).maybeSingle(),
    project.pm_id
      ? admin.from('profiles').select('full_name').eq('id', project.pm_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-2xl flex-col">
      <Link
        href={`/me/jobs/${projectId}`}
        className="text-sm font-bold text-primary hover:underline"
      >
        ‹ Back to project
      </Link>
      <div className="mb-2 mt-2 border-b border-hairline pb-2">
        <div className="font-extrabold text-ink">{tenant?.name ?? 'Your builder'}</div>
        <div className="text-xs text-ink-muted">
          {project.name}
          {pm?.full_name ? ` · ${pm.full_name}` : ''}
        </div>
      </div>
      <MessageThread messages={messages} meId={me.user_id} />
      <div className="pt-3">
        <ProjectChatBox projectId={projectId} />
      </div>
    </div>
  );
}
