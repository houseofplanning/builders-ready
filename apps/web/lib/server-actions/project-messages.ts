'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';

const sendSchema = z.object({
  project_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Post a message to a project's single client↔PM thread (the `messages`
 * table — the same thread the mobile app uses). RLS enforces access via
 * has_project_access(); we only need to stamp tenant_id + sender_id.
 */
export async function sendProjectMessage(
  raw: Record<string, unknown>,
): Promise<SendResult> {
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Message is empty.' };

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: 'Not signed in.' };

  // Need the tenant_id for the row; the client can read their own project
  // row (projects_client_read RLS), the PM/owner via projects_read.
  const { data: project } = await supabase
    .from('projects')
    .select('tenant_id')
    .eq('id', parsed.data.project_id)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Project not found.' };

  const { error } = await supabase.from('messages').insert({
    tenant_id: project.tenant_id,
    project_id: parsed.data.project_id,
    sender_id: auth.user.id,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/me/jobs/${parsed.data.project_id}/chat`);
  return { ok: true };
}
