import { supabase } from './supabase';

export interface ConnThread {
  id: string;
  builder_tenant_id: string;
  sub_tenant_id: string;
  last_message_at: string;
  other_name: string;
  unread: number;
}

export interface ConnMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
}

/**
 * Threads involving my tenant. side='sub' = chats with builders who hired/
 * considered me (For Hire Messages). side='builder' = chats with subs I hired.
 */
export async function listConnThreads(myTenantId: string, side: 'sub' | 'builder'): Promise<ConnThread[]> {
  const col = side === 'sub' ? 'sub_tenant_id' : 'builder_tenant_id';
  const otherCol = side === 'sub' ? 'builder_tenant_id' : 'sub_tenant_id';
  const { data: threads } = await supabase
    .from('connection_threads')
    .select('id, builder_tenant_id, sub_tenant_id, last_message_at')
    .eq(col, myTenantId)
    .order('last_message_at', { ascending: false });
  const rows = (threads ?? []) as Omit<ConnThread, 'other_name' | 'unread'>[];
  if (rows.length === 0) return [];

  const otherIds = [...new Set(rows.map((r) => (r as Record<string, string>)[otherCol]))];
  const { data: names } = await supabase.from('trades_public').select('id, name').in('id', otherIds);
  const nameMap = new Map((names ?? []).map((n) => [(n as { id: string }).id, (n as { name: string }).name]));

  // Unread = messages in my threads not sent by me and not yet read.
  const { data: auth } = await supabase.auth.getUser();
  const myUid = auth.user?.id;
  const { data: unreadRows } = await supabase
    .from('connection_messages')
    .select('thread_id')
    .in('thread_id', rows.map((r) => r.id))
    .is('read_at', null)
    .neq('sender_id', myUid ?? '');
  const unreadMap = new Map<string, number>();
  for (const u of unreadRows ?? []) {
    const t = (u as { thread_id: string }).thread_id;
    unreadMap.set(t, (unreadMap.get(t) ?? 0) + 1);
  }

  return rows.map((r) => ({
    ...r,
    other_name: nameMap.get((r as Record<string, string>)[otherCol]) ?? 'A builder',
    unread: unreadMap.get(r.id) ?? 0,
  }));
}

export async function openConnThread(builderTenantId: string, subTenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc('open_connection_thread', {
    p_builder_tenant: builderTenantId,
    p_sub_tenant: subTenantId,
  });
  if (error) throw error;
  return data as string;
}

export async function listConnMessages(threadId: string): Promise<ConnMessage[]> {
  const { data } = await supabase
    .from('connection_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at');
  return (data ?? []) as ConnMessage[];
}

export async function sendConnMessage(threadId: string, body: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('connection_messages').insert({
    thread_id: threadId,
    sender_id: auth.user?.id,
    body: body.trim(),
  });
  if (error) throw error;
}

export async function markConnThreadRead(threadId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  await supabase
    .from('connection_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .is('read_at', null)
    .neq('sender_id', auth.user?.id ?? '');
}
