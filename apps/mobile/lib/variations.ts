import { supabase } from './supabase';
import type {
  Variation,
  Profile,
  UUID,
  VariationStatus,
} from '@br/shared';

/**
 * Data helpers for the Variations (change-orders) feature. Same defensive
 * pattern as decisions.ts — separate queries instead of PostgREST embeds,
 * so a stale schema cache or FK name mismatch can't silently empty the
 * list.
 */

export interface VariationListItem {
  id: UUID;
  number: string;
  title: string;
  description: string | null;
  delta_amount_gbp_pence: number;
  delta_days: number;
  status: VariationStatus;
  created_at: string;
  decided_at: string | null;
  proposed_by_name: string;
  decided_by_name: string | null;
}

export interface VariationDetail extends Variation {
  proposed_by_profile: Pick<Profile, 'id' | 'full_name'>;
  decided_by_profile: Pick<Profile, 'id' | 'full_name'> | null;
}

export async function listVariationsForProject(
  projectId: UUID,
): Promise<VariationListItem[]> {
  const { data: rows, error } = await supabase
    .from('variations')
    .select(
      'id, number, title, description, delta_amount_gbp_pence, delta_days, status, created_at, decided_at, proposed_by, decided_by',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error || !rows || rows.length === 0) return [];

  const ids = new Set<string>();
  rows.forEach((r) => {
    if (r.proposed_by) ids.add(r.proposed_by);
    if (r.decided_by) ids.add(r.decided_by);
  });
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(ids));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.full_name as string]),
  );

  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    description: r.description,
    delta_amount_gbp_pence: Number(r.delta_amount_gbp_pence),
    delta_days: r.delta_days,
    status: r.status,
    created_at: r.created_at,
    decided_at: r.decided_at,
    proposed_by_name: profileMap.get(r.proposed_by) ?? 'Someone',
    decided_by_name: r.decided_by ? (profileMap.get(r.decided_by) ?? null) : null,
  }));
}

export async function getVariation(id: UUID): Promise<VariationDetail | null> {
  const { data: row, error } = await supabase
    .from('variations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return null;

  const profileIds = [row.proposed_by, row.decided_by].filter(
    (v): v is string => !!v,
  );
  const { data: profiles } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds)
    : { data: [] as { id: string; full_name: string }[] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { id: p.id, full_name: p.full_name },
    ]),
  );

  return {
    ...(row as Variation),
    proposed_by_profile:
      profileMap.get(row.proposed_by) ?? {
        id: row.proposed_by,
        full_name: 'Someone',
      },
    decided_by_profile: row.decided_by
      ? profileMap.get(row.decided_by) ?? null
      : null,
  };
}

/**
 * Pick the next sequential variation number for a tenant, scoped to the
 * current calendar year. Format: VAR-YYYY-NNN (zero-padded to 3 digits).
 *
 * Not transactional — two PMs proposing variations within the same
 * second could collide on the unique(tenant_id, number) constraint, in
 * which case the insert errors and we retry. v1 acceptable; revisit if
 * a tenant ever runs hot enough for it to matter.
 */
export async function nextVariationNumber(tenantId: UUID): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VAR-${year}-`;
  const { data } = await supabase
    .from('variations')
    .select('number')
    .eq('tenant_id', tenantId)
    .like('number', `${prefix}%`)
    .order('number', { ascending: false })
    .limit(1);
  let nextSeq = 1;
  if (data && data[0]) {
    const match = (data[0].number as string).match(/-(\d+)$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${nextSeq.toString().padStart(3, '0')}`;
}

export interface ProposeVariationInput {
  tenant_id: UUID;
  project_id: UUID;
  proposed_by: UUID;
  title: string;
  description: string | null;
  delta_amount_gbp_pence: number;       // can be negative (credit)
  delta_days: number;                    // can be 0 or negative
}

export async function proposeVariation(
  input: ProposeVariationInput,
): Promise<UUID> {
  // Try up to 3 times in case of a number collision under concurrent inserts.
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextVariationNumber(input.tenant_id);
    const { data: row, error } = await supabase
      .from('variations')
      .insert({
        tenant_id: input.tenant_id,
        project_id: input.project_id,
        proposed_by: input.proposed_by,
        number,
        title: input.title,
        description: input.description,
        delta_amount_gbp_pence: input.delta_amount_gbp_pence,
        delta_days: input.delta_days,
        status: 'proposed' as VariationStatus,
      })
      .select('id')
      .single();
    if (!error && row) return row.id;
    if (error?.code !== '23505') {
      throw new Error(error?.message ?? 'Failed to propose variation.');
    }
    // 23505 = unique violation on (tenant_id, number) — retry with a
    // freshly-computed number.
  }
  throw new Error('Could not pick a unique variation number. Try again.');
}

export interface DecideVariationInput {
  variation_id: UUID;
  outcome: 'accepted' | 'rejected';
  /** Required when outcome === 'accepted'. The client's typed name acts
   *  as the audit signature. */
  client_signature: string | null;
  decided_by: UUID;
}

export async function decideVariation(input: DecideVariationInput): Promise<void> {
  if (input.outcome === 'accepted' && !input.client_signature?.trim()) {
    throw new Error('Signature required to accept a variation.');
  }
  const payload = {
    status: input.outcome,
    client_signature:
      input.outcome === 'accepted' ? input.client_signature!.trim() : null,
    decided_at: new Date().toISOString(),
    decided_by: input.decided_by,
  };
  const { error } = await supabase
    .from('variations')
    .update(payload)
    .eq('id', input.variation_id);
  if (error) throw new Error(error.message);
}
