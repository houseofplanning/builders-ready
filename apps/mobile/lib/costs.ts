import { supabase } from './supabase';
import { compressImage } from './upload-photo';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import { computeMargin, type MarginSummary } from '@br/shared';
import type { CostCategory, ProjectCost, UUID } from '@br/shared';

/**
 * Costs & margin data helpers. OWNER/PM ONLY — RLS blocks clients entirely,
 * but the UI should also never route a client here.
 *
 * Margin is against contract value (quote + signed variations). Budgeted cost
 * comes from the estimate the project was converted from, if any.
 */

export interface CostListItem {
  id: UUID;
  category: CostCategory;
  description: string;
  amount_pence: number;
  supplier: string | null;
  incurred_on: string;
  receipt_storage_path: string | null;
}

export async function listCosts(projectId: UUID): Promise<CostListItem[]> {
  const { data, error } = await supabase
    .from('project_costs')
    .select(
      'id, category, description, amount_pence, supplier, incurred_on, receipt_storage_path',
    )
    .eq('project_id', projectId)
    .order('incurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    category: r.category,
    description: r.description,
    amount_pence: Number(r.amount_pence),
    supplier: r.supplier,
    incurred_on: r.incurred_on,
    receipt_storage_path: r.receipt_storage_path,
  }));
}

export interface CreateCostInput {
  tenant_id: UUID;
  project_id: UUID;
  created_by: UUID;
  category: CostCategory;
  description: string;
  amount_pence: number;
  supplier: string | null;
  incurred_on: string;
  receipt_storage_path: string | null;
}

export async function createCost(input: CreateCostInput): Promise<UUID> {
  const { data, error } = await supabase
    .from('project_costs')
    .insert({
      tenant_id: input.tenant_id,
      project_id: input.project_id,
      created_by: input.created_by,
      category: input.category,
      description: input.description,
      amount_pence: input.amount_pence,
      supplier: input.supplier,
      incurred_on: input.incurred_on,
      receipt_storage_path: input.receipt_storage_path,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to save cost.');
  return data.id as string;
}

export async function deleteCost(id: UUID): Promise<void> {
  const { error } = await supabase.from('project_costs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Compress and upload a receipt photo. Returns the storage path. */
export async function uploadCostReceipt(
  tenantId: UUID,
  projectId: UUID,
  uri: string,
): Promise<string> {
  const asset = await compressImage(uri);
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: 'base64',
  });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const path = `${tenantId}/${projectId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('cost-receipts')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Receipt upload failed: ${error.message}`);
  return path;
}

export async function getReceiptUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('cost-receipts')
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export interface ProjectMargin extends MarginSummary {
  by_category: Record<CostCategory, number>;
  cost_count: number;
}

/**
 * Live margin for a project: contract value (quote + signed variations) minus
 * actual cost to date, with budgeted cost from the linked quote if present.
 */
export async function getProjectMargin(projectId: UUID): Promise<ProjectMargin> {
  const [{ data: project }, { data: finance }, { data: costs }, { data: est }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('quoted_amount_pence')
        .eq('id', projectId)
        .maybeSingle(),
      supabase
        .from('project_finance')
        .select('variations_pence')
        .eq('project_id', projectId)
        .maybeSingle(),
      supabase
        .from('project_costs')
        .select('category, amount_pence')
        .eq('project_id', projectId),
      supabase
        .from('estimates')
        .select('cost_subtotal_pence')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const quoted = Number(project?.quoted_amount_pence ?? 0);
  const variations = Number(finance?.variations_pence ?? 0);
  const contractValue = quoted + variations;

  const by_category: Record<CostCategory, number> = {
    materials: 0,
    labour: 0,
    plant_hire: 0,
    subcontractor: 0,
    other: 0,
  };
  let total = 0;
  (costs ?? []).forEach((c) => {
    const amt = Number(c.amount_pence);
    total += amt;
    by_category[c.category as CostCategory] += amt;
  });

  const budgeted =
    est && est.cost_subtotal_pence != null
      ? Number(est.cost_subtotal_pence)
      : null;

  const summary = computeMargin(contractValue, total, budgeted);
  return { ...summary, by_category, cost_count: (costs ?? []).length };
}
