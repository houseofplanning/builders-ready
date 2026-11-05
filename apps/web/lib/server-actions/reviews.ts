'use server';

import { createSupabaseServer } from '../supabase-server';

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

/**
 * Leave a builder<->sub review for a shared job. Direction and the shared-job
 * check are validated server-side by the leave_connection_review function.
 */
export async function leaveConnectionReview(input: {
  project_id: string;
  counterparty_tenant_id: string;
  direction: 'builder_to_sub' | 'sub_to_builder';
  rating: number;
  body: string | null;
}): Promise<ReviewResult> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('leave_connection_review', {
    p_project_id: input.project_id,
    p_counterparty_tenant: input.counterparty_tenant_id,
    p_direction: input.direction,
    p_rating: input.rating,
    p_body: input.body,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
