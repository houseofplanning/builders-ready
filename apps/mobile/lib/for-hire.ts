import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import { supabase } from './supabase';

export interface ForHireProfile {
  discoverable: boolean;
  day_rate_pence: number | null;
  day_rate_unit: 'day' | 'hour';
  for_hire_trades: string[];
  service_area: string | null;
}

export async function getForHireProfile(tenantId: string): Promise<ForHireProfile> {
  const { data } = await supabase
    .from('tenants')
    .select('discoverable, day_rate_pence, day_rate_unit, for_hire_trades, service_area')
    .eq('id', tenantId)
    .single();
  return {
    discoverable: Boolean(data?.discoverable),
    day_rate_pence: (data?.day_rate_pence as number | null) ?? null,
    day_rate_unit: ((data?.day_rate_unit as string | null) ?? 'day') === 'hour' ? 'hour' : 'day',
    for_hire_trades: (data?.for_hire_trades as string[] | null) ?? [],
    service_area: (data?.service_area as string | null) ?? null,
  };
}

export async function saveForHireProfile(tenantId: string, p: ForHireProfile): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({
      discoverable: p.discoverable,
      day_rate_pence: p.day_rate_pence,
      day_rate_unit: p.day_rate_unit,
      for_hire_trades: p.for_hire_trades.slice(0, 20),
      service_area: p.service_area?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId);
  if (error) throw error;
}

export interface OpenSubJob {
  id: string;
  tenant_id: string;
  trade: string | null;
  title: string;
  description: string | null;
  area: string | null;
  duration_note: string | null;
  budget_note: string | null;
  created_at: string;
  poster_name: string;
  my_bid_status: string | null;
}

export async function listOpenSubJobs(myTenantId: string): Promise<OpenSubJob[]> {
  const { data: posts } = await supabase
    .from('sub_job_posts')
    .select('id, tenant_id, trade, title, description, area, duration_note, budget_note, created_at')
    .eq('status', 'open')
    .neq('tenant_id', myTenantId)
    .order('created_at', { ascending: false });
  const rows = (posts ?? []) as Omit<OpenSubJob, 'poster_name' | 'my_bid_status'>[];
  if (rows.length === 0) return [];

  const posterIds = [...new Set(rows.map((r) => r.tenant_id))];
  const { data: names } = await supabase.from('trades_public').select('id, name').in('id', posterIds);
  const nameMap = new Map((names ?? []).map((n) => [(n as { id: string }).id, (n as { name: string }).name]));

  const { data: myBids } = await supabase
    .from('sub_job_bids')
    .select('post_id, status')
    .eq('bidder_tenant_id', myTenantId);
  const bidMap = new Map((myBids ?? []).map((b) => [(b as { post_id: string }).post_id, (b as { status: string }).status]));

  return rows.map((r) => ({
    ...r,
    poster_name: nameMap.get(r.tenant_id) ?? 'A builder',
    my_bid_status: bidMap.get(r.id) ?? null,
  }));
}

export async function placeSubBid(input: {
  post_id: string;
  my_tenant_id: string;
  amount_pence: number | null;
  message: string | null;
}): Promise<void> {
  const { error } = await supabase.from('sub_job_bids').insert({
    post_id: input.post_id,
    bidder_tenant_id: input.my_tenant_id,
    amount_pence: input.amount_pence,
    message: input.message?.trim() || null,
  });
  if (error) throw error;
}

// --- Certificates on the For Hire profile (tenant_documents) ---------------

export interface TenantDoc {
  id: string;
  doc_type: string;
  reference: string | null;
  expires_on: string | null;
  file_path: string | null;
  verified: boolean;
}

export async function listTenantDocs(tenantId: string): Promise<TenantDoc[]> {
  const { data } = await supabase
    .from('tenant_documents')
    .select('id, doc_type, reference, expires_on, file_path, verified')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return (data ?? []) as TenantDoc[];
}

/** Upload a cert file (image/pdf) to resource-docs under <tenant>/certs/. */
export async function uploadCertFile(
  tenantId: string,
  uri: string,
  contentType: string,
  ext: string,
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const path = `${tenantId}/certs/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from('resource-docs').upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function addTenantDoc(input: {
  tenant_id: string;
  doc_type: string;
  reference: string | null;
  expires_on: string | null;
  file_path: string | null;
}): Promise<void> {
  const { error } = await supabase.from('tenant_documents').insert({
    tenant_id: input.tenant_id,
    doc_type: input.doc_type,
    reference: input.reference?.trim() || null,
    expires_on: input.expires_on || null,
    file_path: input.file_path,
  });
  if (error) throw error;
}

export async function deleteTenantDoc(id: string, filePath: string | null): Promise<void> {
  const { error } = await supabase.from('tenant_documents').delete().eq('id', id);
  if (error) throw error;
  if (filePath) await supabase.storage.from('resource-docs').remove([filePath]).catch(() => null);
}

/** A short-lived URL to view a cert file (owner only, per storage policy). */
export async function getCertSignedUrl(filePath: string): Promise<string | null> {
  const { data } = await supabase.storage.from('resource-docs').createSignedUrl(filePath, 300);
  return data?.signedUrl ?? null;
}
