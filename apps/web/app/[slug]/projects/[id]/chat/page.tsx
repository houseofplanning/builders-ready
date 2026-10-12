import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { MessageThread } from '@/components/marketplace/message-thread';
import { ProjectChatBox } from '@/components/project-chat-box';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

/**
 * Builder-side project chat — the client↔PM thread (the `messages` table, the
 * same one the client sees at /me/jobs/[id]/chat and the app uses). Previously
 * the builder could only reach this in the mobile app; the web Messages nav
 * only lists marketplace threads.
 */
export default async function BuilderProjectChatPage({ params }: Props) {
  const { slug, id } = await params;
  const { tenant, user_id } = await requireTenantBySlug(slug);
  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, tenant_id, client_id')
    .eq('id', id)
    .maybeSingle();
  if (!project || project.tenant_id !== tenant.id) notFound();

  const { data: rawMessages } = await supabase
    .from('messages')
    .select('id, sender_id, body, sent_at')
    .eq('project_id', id)
    .order('sent_at', { ascending: true });
  const messages = (rawMessages ?? []).map((m) => ({
    id: m.id as string,
    sender_id: m.sender_id as string,
    body: m.body as string,
    created_at: m.sent_at as string,
  }));

  let clientName = 'your client';
  if (project.client_id) {
    const { data: client } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', project.client_id)
      .maybeSingle();
    if (client?.full_name) clientName = client.full_name;
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-2xl flex-col">
      <Link
        href={`/${slug}/projects/${id}`}
        className="text-sm font-bold text-primary hover:underline"
      >
        ‹ Back to project
      </Link>
      <div className="mb-2 mt-2 border-b border-hairline pb-2">
        <div className="font-extrabold text-ink">{clientName}</div>
        <div className="text-xs text-ink-muted">{project.name}</div>
      </div>
      <MessageThread messages={messages} meId={user_id} />
      <div className="pt-3">
        <ProjectChatBox projectId={id} />
      </div>
    </div>
  );
}
