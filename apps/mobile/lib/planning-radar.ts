import { supabase } from './supabase';
import type { UUID } from '@br/shared';

/**
 * Planning Radar (mobile, trade side).
 *
 * Reads UK planning-application leads from `search_planning_listings` (radius
 * search with haversine distance) and lets a builder work them through a
 * private pipeline (saved → approached → replied → won → not_interested).
 *
 * Location comes from a UK postcode the builder types, geocoded via the free
 * postcodes.io API. Searching an area also registers it as a catchment so the
 * nightly ingest starts covering it.
 */

/**
 * Entitlement hook for Planning Radar. Free-first: included in every active
 * trade's subscription today. To gate it to a paid tier later, change this to
 * check the tenant's subscription_tier — every entry point already runs it.
 */
export function planningRadarEntitled(): boolean {
  return true;
}

export type PlanningStatus =
  | 'approved'
  | 'pending'
  | 'refused'
  | 'withdrawn'
  | 'other';

export type PlanningStage =
  | 'saved'
  | 'approached'
  | 'replied'
  | 'won'
  | 'not_interested';

export interface PlanningListing {
  id: string;
  authority: string | null;
  address: string;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  application_type: string | null;
  work_category: string | null;
  status: PlanningStatus;
  status_raw: string | null;
  validated_date: string | null;
  decided_date: string | null;
  portal_url: string | null;
  distance_km?: number | null;
}

export interface PipelineItem {
  stage: PlanningStage;
  note: string | null;
  listing: PlanningListing;
}

export const WORK_CATEGORY_OPTIONS = [
  { label: 'All work types', value: '' },
  { label: 'Rear extension', value: 'Rear extension' },
  { label: 'Side extension', value: 'Side extension' },
  { label: 'Two-storey extension', value: 'Two-storey extension' },
  { label: 'Wraparound extension', value: 'Wraparound extension' },
  { label: 'Extension', value: 'Extension' },
  { label: 'Loft conversion', value: 'Loft conversion' },
  { label: 'Dormer', value: 'Dormer' },
  { label: 'Basement', value: 'Basement' },
  { label: 'Garage conversion', value: 'Garage conversion' },
  { label: 'Outbuilding / garden room', value: 'Outbuilding / garden room' },
  { label: 'Porch', value: 'Porch' },
  { label: 'New dwelling', value: 'New dwelling' },
];

export const STATUS_FILTER_OPTIONS = [
  { label: 'Approved + new', value: 'approved,pending' },
  { label: 'Approved only', value: 'approved' },
  { label: 'New / pending', value: 'pending' },
  { label: 'All statuses', value: '' },
];

export const DISTANCE_OPTIONS = [
  { label: 'Within ½ mile', value: '0.8' },
  { label: 'Within 1 mile', value: '1.6' },
  { label: 'Within 3 miles', value: '4.8' },
  { label: 'Within 5 miles', value: '8' },
  { label: 'Within 10 miles', value: '16' },
  { label: 'Within 15 miles', value: '24' },
];

export interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
}

/** Geocode a UK postcode (full or outward code) via postcodes.io. */
export async function geocodePostcode(input: string): Promise<GeoPoint | null> {
  const raw = input.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!raw) return null;
  const full = raw.replace(/\s+/g, '');
  const tryUrls = [
    `https://api.postcodes.io/postcodes/${encodeURIComponent(raw)}`,
    `https://api.postcodes.io/outcodes/${encodeURIComponent(full.replace(/\d[A-Z]{2}$/, '').trim() || full)}`,
  ];
  for (const url of tryUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: { latitude?: number; longitude?: number } };
      const r = json?.result;
      if (r && typeof r.latitude === 'number' && typeof r.longitude === 'number') {
        return { lat: r.latitude, lon: r.longitude, label: raw };
      }
    } catch {
      // try next
    }
  }
  return null;
}

function parseStatuses(csv: string): PlanningStatus[] | null {
  const parts = csv.split(',').map((s) => s.trim()).filter(Boolean) as PlanningStatus[];
  return parts.length ? parts : null;
}

export async function searchPlanningListings(opts: {
  lat: number;
  lon: number;
  radiusKm: number;
  workCategory?: string;
  statusCsv?: string;
  limit?: number;
}): Promise<PlanningListing[]> {
  // Note: ingest is national-by-date (whole UK), so no per-area registration
  // is needed — any postcode already has data.
  const { data, error } = await supabase.rpc('search_planning_listings', {
    p_lat: opts.lat,
    p_lon: opts.lon,
    p_radius_km: opts.radiusKm,
    p_work_categories: opts.workCategory ? [opts.workCategory] : null,
    p_statuses: opts.statusCsv ? parseStatuses(opts.statusCsv) : null,
    p_limit: opts.limit ?? 100,
    p_offset: 0,
  });
  if (error) throw error;
  return (data ?? []) as PlanningListing[];
}

export async function getPlanningListing(id: string): Promise<PlanningListing | null> {
  const { data, error } = await supabase
    .from('planning_listings')
    .select(
      'id, authority, address, postcode, latitude, longitude, description, application_type, work_category, status, status_raw, validated_date, decided_date, portal_url',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PlanningListing) ?? null;
}

export async function getListingStage(
  listingId: string,
  tenantId: UUID,
): Promise<PlanningStage | null> {
  const { data, error } = await supabase
    .from('planning_listing_actions')
    .select('stage')
    .eq('listing_id', listingId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw error;
  return (data?.stage as PlanningStage) ?? null;
}

export async function setListingStage(args: {
  listingId: string;
  tenantId: UUID;
  userId: UUID;
  stage: PlanningStage;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('planning_listing_actions').upsert(
    {
      listing_id: args.listingId,
      tenant_id: args.tenantId,
      created_by: args.userId,
      stage: args.stage,
      note: args.note ?? null,
    },
    { onConflict: 'listing_id,tenant_id' },
  );
  if (error) throw error;
}

export async function savePlanningSearch(args: {
  tenantId: UUID;
  userId: UUID;
  name?: string | null;
  centerLat: number;
  centerLon: number;
  radiusKm: number;
  workCategory?: string;
  statusCsv?: string;
}): Promise<void> {
  const { error } = await supabase.from('planning_saved_searches').insert({
    tenant_id: args.tenantId,
    created_by: args.userId,
    name: args.name ?? null,
    center_lat: args.centerLat,
    center_lon: args.centerLon,
    radius_miles: args.radiusKm / 1.60934,
    work_categories: args.workCategory ? [args.workCategory] : [],
    statuses: args.statusCsv ? (parseStatuses(args.statusCsv) ?? []) : [],
    alerts_enabled: true,
  });
  if (error) throw error;
}

export async function listPipeline(tenantId: UUID): Promise<PipelineItem[]> {
  const { data, error } = await supabase
    .from('planning_listing_actions')
    .select(
      'stage, note, listing:planning_listings(id, authority, address, postcode, latitude, longitude, description, application_type, work_category, status, status_raw, validated_date, decided_date, portal_url)',
    )
    .eq('tenant_id', tenantId)
    .neq('stage', 'not_interested')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as PipelineItem[]).filter((r) => r.listing);
}

// ---- letter (PR-6) ------------------------------------------------------
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://buildersready.uk';

/** Auto-draft an occupier letter from a listing, in the builder's voice. */
export function buildLetterDraft(
  listing: PlanningListing,
  businessName: string,
  businessPhone: string | null,
): string {
  const work = (listing.work_category ?? 'the work')?.toLowerCase();
  const { line1 } = splitAddress(listing.address, listing.postcode);
  const statusLine =
    listing.status === 'approved'
      ? `I noticed planning permission has recently been granted for ${work} at ${line1}.`
      : `I noticed a planning application has recently been submitted for ${work} at ${line1}.`;
  return [
    `Dear neighbour,`,
    ``,
    statusLine,
    ``,
    `I'm a local builder and this is exactly the kind of work I do. If you haven't yet lined up someone to carry it out, I'd be glad to come and take a look and give you a free, no-obligation quote.`,
    ``,
    `There's no pressure at all — even if it's just to talk through your options and rough costs, I'm happy to help.`,
    ``,
    businessPhone
      ? `You can reach me on ${businessPhone}. I look forward to hearing from you.`
      : `I look forward to hearing from you.`,
    ``,
    `Kind regards,`,
    businessName,
  ].join('\n');
}

export interface SendLetterResult {
  to: string | null;
}

/** Render + email the letter PDF to the builder's own address (server-side). */
export async function emailPlanningLetter(
  listingId: string,
  body: string,
): Promise<SendLetterResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  const res = await fetch(`${WEB_URL}/api/planning/letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ listing_id: listingId, body }),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; to?: string | null; error?: string };
  if (!res.ok || !json.ok) throw new Error(json.error ?? 'Could not send the letter.');
  return { to: json.to ?? null };
}

// ---- display helpers ----------------------------------------------------
export function statusBadge(status: PlanningStatus): { label: string; fg: string; bg: string } {
  switch (status) {
    case 'approved':
      return { label: 'APPROVED', fg: '#2E7D5B', bg: '#E3F3EA' };
    case 'pending':
      return { label: 'NEW', fg: '#B5731F', bg: '#FBEFE0' };
    case 'refused':
      return { label: 'REFUSED', fg: '#B23B3B', bg: '#F7E5E5' };
    case 'withdrawn':
      return { label: 'WITHDRAWN', fg: '#5F7480', bg: '#EEF1F2' };
    default:
      return { label: 'OTHER', fg: '#5F7480', bg: '#EEF1F2' };
  }
}

export function milesFromKm(km: number | null | undefined): string {
  if (km == null) return '';
  const mi = km * 0.621371;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

/** Map a normalised work_category to a Builders Ready project template key. */
export function workCategoryToTemplateKey(wc: string | null): string {
  switch (wc) {
    case 'Loft conversion':
    case 'Dormer':
      return 'loft_conversion';
    case 'Basement':
      return 'basement';
    case 'Garage conversion':
      return 'garage_conversion';
    case 'New dwelling':
    case 'Outbuilding / garden room':
      return 'new_build';
    case 'Rear extension':
    case 'Side extension':
    case 'Two-storey extension':
    case 'Wraparound extension':
    case 'Extension':
    case 'Porch':
      return 'extension';
    default:
      return 'full_renovation';
  }
}

/** Split a full planning address into a line1 (postcode stripped) + postcode. */
export function splitAddress(address: string, postcode: string | null): {
  line1: string;
  postcode: string | null;
} {
  const pc = postcode?.trim() || null;
  let line1 = address.trim();
  if (pc && line1.toUpperCase().endsWith(pc.toUpperCase())) {
    line1 = line1.slice(0, line1.length - pc.length).replace(/[,\s]+$/, '').trim();
  }
  return { line1, postcode: pc };
}

export const STAGE_LABELS: Record<PlanningStage, string> = {
  saved: 'Saved',
  approached: 'Approached',
  replied: 'Replied',
  won: 'Won',
  not_interested: 'Not interested',
};
