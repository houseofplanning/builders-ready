import { supabase } from './supabase';
import type {
  Decision,
  DecisionOption,
  Profile,
  UUID,
} from '@br/shared';

/**
 * Data helpers for the Decisions inbox. Every call goes through the
 * client supabase instance — RLS enforces tenant + project scoping,
 * and the role-specific UPDATE policies enforce who can do what:
 *
 *   - owner/PM:   raise decisions, edit until decided
 *   - client:     set selected_option_id + status to accepted/rejected
 *                 (the reports_client_ack-style policy)
 */

export interface DecisionListItem {
  id: UUID;
  title: string;
  description: string | null;
  deadline: string | null;
  status: Decision['status'];
  selected_option_id: UUID | null;
  decided_at: string | null;
  raised_by_name: string;
  decided_by_name: string | null;
  option_count: number;
  cheapest_pence: number | null;
  dearest_pence: number | null;
}

export interface DecisionDetail extends Decision {
  options: DecisionOption[];
  raised_by_profile: Pick<Profile, 'id' | 'full_name'>;
  decided_by_profile: Pick<Profile, 'id' | 'full_name'> | null;
}

/**
 * Fetch every decision (open + decided) for a project.
 *
 * We deliberately avoid PostgREST's embedded-relation syntax here because
 * the decisions table has two FKs to profiles (raised_by + decided_by),
 * which can fall over silently if the FK constraint name hint doesn't
 * resolve. Three plain queries are an order of magnitude more reliable
 * for the same data — RLS gates each one separately so the security
 * posture is identical.
 */
export async function listDecisionsForProject(projectId: UUID): Promise<DecisionListItem[]> {
  // 1) decisions
  const { data: decisions, error } = await supabase
    .from('decisions')
    .select(
      'id, title, description, deadline, status, selected_option_id, decided_at, raised_by, decided_by, created_at',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error || !decisions || decisions.length === 0) return [];

  // 2) every profile referenced by raised_by or decided_by, in one shot
  const profileIds = new Set<string>();
  decisions.forEach((d) => {
    if (d.raised_by) profileIds.add(d.raised_by);
    if (d.decided_by) profileIds.add(d.decided_by);
  });
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(profileIds));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.full_name as string]),
  );

  // 3) options for these decisions (price + count + range derived client-side)
  const decisionIds = decisions.map((d) => d.id);
  const { data: optionRows } = await supabase
    .from('decision_options')
    .select('decision_id, price_gbp_pence')
    .in('decision_id', decisionIds);
  const optionsByDecision = new Map<string, number[]>();
  const countsByDecision = new Map<string, number>();
  (optionRows ?? []).forEach((o) => {
    const k = o.decision_id as string;
    countsByDecision.set(k, (countsByDecision.get(k) ?? 0) + 1);
    if (o.price_gbp_pence !== null && o.price_gbp_pence !== undefined) {
      if (!optionsByDecision.has(k)) optionsByDecision.set(k, []);
      optionsByDecision.get(k)!.push(o.price_gbp_pence as number);
    }
  });

  return decisions.map((d) => {
    const prices = optionsByDecision.get(d.id) ?? [];
    return {
      id: d.id,
      title: d.title,
      description: d.description,
      deadline: d.deadline,
      status: d.status,
      selected_option_id: d.selected_option_id,
      decided_at: d.decided_at,
      raised_by_name: profileMap.get(d.raised_by) ?? 'Someone',
      decided_by_name: d.decided_by ? (profileMap.get(d.decided_by) ?? null) : null,
      option_count: countsByDecision.get(d.id) ?? 0,
      cheapest_pence: prices.length ? Math.min(...prices) : null,
      dearest_pence: prices.length ? Math.max(...prices) : null,
    };
  });
}

/**
 * Fetch a single decision with all options + profile joins. Three plain
 * queries (same reasoning as listDecisionsForProject).
 */
export async function getDecision(id: UUID): Promise<DecisionDetail | null> {
  const { data: row, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return null;

  const profileIds = [row.raised_by, row.decided_by].filter(
    (v): v is string => !!v,
  );
  const { data: profiles } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds)
    : { data: [] as { id: string; full_name: string }[] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, { id: p.id, full_name: p.full_name }]),
  );

  const { data: options } = await supabase
    .from('decision_options')
    .select('*')
    .eq('decision_id', id);

  return {
    ...(row as Decision),
    options: ((options ?? []) as DecisionOption[]).sort(
      (a, b) => a.position - b.position,
    ),
    raised_by_profile:
      profileMap.get(row.raised_by) ?? { id: row.raised_by, full_name: 'Someone' },
    decided_by_profile: row.decided_by ? profileMap.get(row.decided_by) ?? null : null,
  };
}

export interface RaiseDecisionInput {
  tenant_id: UUID;
  project_id: UUID;
  raised_by: UUID;
  title: string;
  description: string | null;
  deadline: string | null;
  options: {
    label: string;
    description: string | null;
    price_gbp_pence: number | null;
    photo_storage_path: string | null;
  }[];
}

/**
 * Raise a new decision and insert its options atomically (well, two
 * round-trips). Returns the new decision id on success.
 */
export async function raiseDecision(input: RaiseDecisionInput): Promise<UUID> {
  const { data: row, error } = await supabase
    .from('decisions')
    .insert({
      tenant_id: input.tenant_id,
      project_id: input.project_id,
      raised_by: input.raised_by,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      status: 'open',
    })
    .select('id')
    .single();
  if (error || !row) throw new Error(error?.message ?? 'Insert failed');

  const optionRows = input.options.map((o, idx) => ({
    decision_id: row.id,
    tenant_id: input.tenant_id,
    label: o.label,
    description: o.description,
    price_gbp_pence: o.price_gbp_pence,
    photo_storage_path: o.photo_storage_path,
    position: idx,
  }));
  const { error: optErr } = await supabase
    .from('decision_options')
    .insert(optionRows);
  if (optErr) {
    // Clean up the orphaned decision row.
    await supabase.from('decisions').delete().eq('id', row.id);
    throw new Error(optErr.message);
  }
  return row.id;
}

/**
 * Client side accept / reject. Sets selected_option_id (if accepting),
 * status, decided_at, decided_by.
 */
export async function decideDecision(params: {
  decision_id: UUID;
  outcome: 'accepted' | 'rejected';
  selected_option_id: UUID | null;
  decided_by: UUID;
}): Promise<void> {
  const payload = {
    status: params.outcome,
    selected_option_id:
      params.outcome === 'accepted' ? params.selected_option_id : null,
    decided_at: new Date().toISOString(),
    decided_by: params.decided_by,
  };
  const { error } = await supabase
    .from('decisions')
    .update(payload)
    .eq('id', params.decision_id);
  if (error) throw new Error(error.message);
}
