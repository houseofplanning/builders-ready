import { supabase } from './supabase';
import type { Message, Profile, UUID } from '@br/shared';

/**
 * One message thread per project. RLS gates by project access; both
 * sides of the conversation (client + PM) can read and post.
 */

export interface ThreadMessage extends Message {
  sender_name: string;
}

export async function listMessagesForProject(
  projectId: UUID,
): Promise<ThreadMessage[]> {
  const { data: rows, error } = await supabase
    .from('messages')
    .select('id, tenant_id, project_id, sender_id, body, sent_at, read_at')
    .eq('project_id', projectId)
    .order('sent_at', { ascending: true });
  if (error || !rows || rows.length === 0) return [];

  const senderIds = Array.from(new Set(rows.map((r) => r.sender_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', senderIds);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.full_name as string]),
  );

  return rows.map((m) => ({
    ...(m as Message),
    sender_name: profileMap.get(m.sender_id) ?? 'Someone',
  }));
}

export async function sendMessage(params: {
  tenant_id: UUID;
  project_id: UUID;
  sender_id: UUID;
  body: string;
}): Promise<UUID> {
  const body = params.body.trim();
  if (!body) throw new Error('Message is empty.');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: params.tenant_id,
      project_id: params.project_id,
      sender_id: params.sender_id,
      body,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Send failed.');
  return data.id;
}

/**
 * Mark every unread message in the thread as read. Best-effort; if RLS
 * blocks any rows (e.g. the user is the sender of an unread row, which
 * shouldn't happen but just in case), the update silently no-ops.
 */
export async function markThreadRead(params: {
  project_id: UUID;
  reader_id: UUID;
}): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('project_id', params.project_id)
    .neq('sender_id', params.reader_id)
    .is('read_at', null);
}
