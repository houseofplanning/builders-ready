import { supabase } from './supabase';
import type { Report, Profile, UUID } from '@br/shared';

/**
 * Data helpers for Reports. Two kinds:
 *   - 'pdf'       — builder uploads a PDF (e.g. existing weekly template)
 *   - 'structured' — builder fills the form (summary / next_week / risks /
 *                    decisions_needed) and we render it nicely on the client.
 *
 * Acknowledgement is the client confirming they've read it — captures
 * acknowledged_at + acknowledged_by for the audit trail. Useful for the
 * handover PDF and for builders who get asked "did you tell me about X?"
 */

export interface ReportListItem {
  id: UUID;
  title: string;
  kind: Report['kind'];
  summary_preview: string | null;
  posted_at: string;
  acknowledged_at: string | null;
  posted_by_name: string;
  acknowledged_by_name: string | null;
}

export interface ReportDetail extends Report {
  posted_by_profile: Pick<Profile, 'id' | 'full_name'>;
  acknowledged_by_profile: Pick<Profile, 'id' | 'full_name'> | null;
}

export async function listReportsForProject(
  projectId: UUID,
): Promise<ReportListItem[]> {
  const { data: rows, error } = await supabase
    .from('reports')
    .select(
      'id, title, kind, summary, posted_at, acknowledged_at, posted_by, acknowledged_by',
    )
    .eq('project_id', projectId)
    .order('posted_at', { ascending: false });
  if (error || !rows || rows.length === 0) return [];

  const ids = new Set<string>();
  rows.forEach((r) => {
    if (r.posted_by) ids.add(r.posted_by);
    if (r.acknowledged_by) ids.add(r.acknowledged_by);
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
    title: r.title,
    kind: r.kind,
    summary_preview: r.summary
      ? (r.summary as string).slice(0, 160)
      : null,
    posted_at: r.posted_at,
    acknowledged_at: r.acknowledged_at,
    posted_by_name: profileMap.get(r.posted_by) ?? 'Someone',
    acknowledged_by_name: r.acknowledged_by
      ? profileMap.get(r.acknowledged_by) ?? null
      : null,
  }));
}

export async function getReport(id: UUID): Promise<ReportDetail | null> {
  const { data: row, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return null;

  const profileIds = [row.posted_by, row.acknowledged_by].filter(
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
    ...(row as Report),
    posted_by_profile:
      profileMap.get(row.posted_by) ?? {
        id: row.posted_by,
        full_name: 'Someone',
      },
    acknowledged_by_profile: row.acknowledged_by
      ? profileMap.get(row.acknowledged_by) ?? null
      : null,
  };
}

export interface CreateStructuredReportInput {
  tenant_id: UUID;
  project_id: UUID;
  posted_by: UUID;
  title: string;
  summary: string;
  next_week: string | null;
  risks: string | null;
  decisions_needed: string | null;
}

export async function createStructuredReport(
  input: CreateStructuredReportInput,
): Promise<UUID> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      tenant_id: input.tenant_id,
      project_id: input.project_id,
      posted_by: input.posted_by,
      title: input.title,
      kind: 'structured',
      summary: input.summary,
      next_week: input.next_week,
      risks: input.risks,
      decisions_needed: input.decisions_needed,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Insert failed.');
  return data.id;
}

export interface CreatePdfReportInput {
  tenant_id: UUID;
  project_id: UUID;
  posted_by: UUID;
  title: string;
  pdf_storage_path: string;
}

export async function createPdfReport(input: CreatePdfReportInput): Promise<UUID> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      tenant_id: input.tenant_id,
      project_id: input.project_id,
      posted_by: input.posted_by,
      title: input.title,
      kind: 'pdf',
      pdf_storage_path: input.pdf_storage_path,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Insert failed.');
  return data.id;
}

export async function acknowledgeReport(params: {
  report_id: UUID;
  acknowledged_by: UUID;
}): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: params.acknowledged_by,
    })
    .eq('id', params.report_id);
  if (error) throw new Error(error.message);
}
