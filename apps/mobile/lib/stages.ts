import { supabase } from './supabase';

export interface StageEdit {
  id: string | null;
  name: string;
  start_date: string | null;
  target_end_date: string | null;
}

export interface SaveStagesResult {
  ok: boolean;
  error?: string;
}

/**
 * Full timeline edit — add / remove / reorder / rename / re-date a project's
 * stages in one atomic transaction. Mirrors the web `saveProjectStages` server
 * action; both call the same `save_project_stages` SECURITY DEFINER RPC, which
 * preserves each existing stage's status and blocks removing a stage that has
 * updates posted against it (and rolls the whole edit back if it does).
 */
export async function saveProjectStages(
  projectId: string,
  stages: StageEdit[],
): Promise<SaveStagesResult> {
  const cleaned = stages
    .map((s) => ({
      id: s.id,
      name: s.name.trim(),
      start_date: s.start_date || null,
      target_end_date: s.target_end_date || null,
    }))
    .filter((s) => s.name.length > 0);

  if (cleaned.length === 0) {
    return { ok: false, error: 'Add at least one stage.' };
  }
  for (const s of cleaned) {
    if (s.start_date && s.target_end_date && s.target_end_date < s.start_date) {
      return { ok: false, error: `"${s.name}" ends before it starts — check the dates.` };
    }
  }

  const { error } = await supabase.rpc('save_project_stages', {
    p_project: projectId,
    p_stages: cleaned,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
