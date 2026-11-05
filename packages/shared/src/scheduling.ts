/**
 * Scheduling & resource management — shared by web and mobile.
 *
 * A `Resource` is anyone/anything you can put on a job (staff, operative or
 * subcontractor), carrying a cost-to-business rate. An `Assignment` books a
 * resource on a project (optionally a stage) for a time range and carries a
 * computed cost (rate x duration). All money is integer pence. Rates, costs
 * and margin are owner/PM-only; never surface these to a client.
 *
 * The cost maths here MUST mirror the SQL trigger `compute_assignment_cost`
 * in migration 57 (8-hour working day for a day rate) so web, mobile and the
 * database never disagree.
 */

import type { CostCategory } from './types';

export type ResourceKind = 'staff' | 'operative' | 'subcontractor' | 'plant';
export type RateUnit = 'day' | 'hour' | 'annual';

/**
 * Connection state of a resource — whether the person behind a `resources`
 * row can see their jobs and respond, or is just a typed-in contact card.
 * A PAID tradesman connects via `marketplace_tenant_id` (they are a tenant);
 * a FREE operative connects via `user_id` (a plain login). Both are valid.
 */
export type ConnectionStatus =
  | 'contact_only'
  | 'invited'
  | 'connected'
  | 'disconnected';
export type BookingKind = 'work' | 'travel' | 'leave' | 'unplanned';
export type AssignmentStatus =
  | 'planned'
  | 'confirmed'
  | 'in_progress'
  | 'done'
  | 'cancelled';

export const RESOURCE_KINDS: ResourceKind[] = [
  'staff',
  'operative',
  'subcontractor',
  'plant',
];

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  staff: 'Office / staff',
  operative: 'Operative',
  subcontractor: 'Subcontractor',
  plant: 'Plant / equipment',
};

export const BOOKING_KIND_LABELS: Record<BookingKind, string> = {
  work: 'Work',
  travel: 'Travel',
  leave: 'Leave',
  unplanned: 'Unplanned',
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  planned: 'Planned',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const RATE_UNIT_LABELS: Record<RateUnit, string> = {
  day: 'Day rate',
  hour: 'Hourly',
  annual: 'Salary (annual)',
};

/** Equipment categories offered when adding plant (stored in resource.trade). */
export const PLANT_TYPES = [
  'Excavator / digger',
  'Dumper',
  'Telehandler',
  'Mini digger',
  'Scaffold',
  'Access platform / cherry picker',
  'Generator',
  'Compactor / roller',
  'Cement mixer',
  'Van / vehicle',
  'Tools / other',
] as const;

/** Standard working day / year used to pro-rate rates. Keep in step with SQL. */
export const WORKING_DAY_HOURS = 8;
export const WORKING_DAYS_PER_YEAR = 232;

/** Permanent team (staff + operatives) — not subbies, not plant. */
export function isPermanent(kind: ResourceKind): boolean {
  return kind === 'staff' || kind === 'operative';
}
export const isPlant = (kind: ResourceKind): boolean => kind === 'plant';

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  contact_only: 'Contact only',
  invited: 'Invite sent',
  connected: 'Connected',
  disconnected: 'Disconnected',
};

/** Is this resource a live, two-way connection (sees their jobs, responds)? */
export const isConnected = (s: ConnectionStatus): boolean => s === 'connected';

/** Can this resource be invited to connect? (Plant can't; it has no person.) */
export function canInviteToConnect(
  kind: ResourceKind,
  status: ConnectionStatus,
): boolean {
  return kind !== 'plant' && (status === 'contact_only' || status === 'disconnected');
}

/** A pending/accepted invite to connect a contact (Door A). */
export interface ResourceInvite {
  id: string;
  tenant_id: string;
  resource_id: string;
  channel: 'email' | 'sms';
  sent_to: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_by: string | null;
  accepted_user_id: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface Resource {
  id: string;
  tenant_id: string;
  kind: ResourceKind;
  display_name: string;
  user_id: string | null;
  member_user_id: string | null;
  trade: string | null;
  marketplace_tenant_id: string | null;
  connection_status: ConnectionStatus;
  phone: string | null;
  email: string | null;
  cost_rate_pence: number | null;
  cost_rate_unit: RateUnit;
  /** Subcontractor engagement window (null for permanent team). */
  engaged_from: string | null;
  engaged_to: string | null;
  /** True-cost uplift on permanent staff (employer NI, pension, holiday). */
  on_cost_percent: number;
  colour: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceDocument {
  id: string;
  tenant_id: string;
  resource_id: string;
  doc_type: string;
  reference: string | null;
  issued_on: string | null;
  expires_on: string | null;
  file_path: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

/** Common construction accreditations, offered in the certs picker. */
export const DOCUMENT_TYPES = [
  'Public liability insurance',
  'CSCS card',
  'Gas Safe',
  'NICEIC',
  'NAPIT',
  'CHAS',
  'FMB',
  'TrustMark',
  'ECS card',
  'First aid',
  'Asbestos awareness',
  'Other',
] as const;

export type CertStatus = 'valid' | 'expiring' | 'expired' | 'none';

/** Days until a cert expires (negative = already expired; null if no date). */
export function daysToExpiry(expiresOn: string | null, now = new Date()): number | null {
  if (!expiresOn) return null;
  const end = Date.parse(expiresOn);
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - now.getTime()) / 86_400_000);
}

/** Cert status, with a configurable "expiring soon" window (default 30 days). */
export function certStatus(
  expiresOn: string | null,
  soonDays = 30,
  now = new Date(),
): CertStatus {
  const d = daysToExpiry(expiresOn, now);
  if (d == null) return 'none';
  if (d < 0) return 'expired';
  if (d <= soonDays) return 'expiring';
  return 'valid';
}

export interface Assignment {
  id: string;
  tenant_id: string;
  project_id: string;
  stage_id: string | null;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  booking_kind: BookingKind;
  status: AssignmentStatus;
  note: string | null;
  cost_pence: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Hours between two ISO timestamps (0 if invalid or non-positive). */
export function bookingHours(startsAt: string, endsAt: string): number {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / 3_600_000;
}

/**
 * Cost of a booking in pence. Mirrors the SQL trigger exactly: leave and
 * unrated resources cost nothing; an hour rate is literal hours; a day rate is
 * pro-rated against an 8-hour working day; an annual salary is spread over 232
 * working days; and an on-cost percentage uplifts the result (true cost).
 */
export function computeAssignmentCostPence(
  ratePence: number | null,
  unit: RateUnit,
  startsAt: string,
  endsAt: string,
  bookingKind: BookingKind,
  onCostPercent = 0,
): number {
  if (ratePence == null || bookingKind === 'leave') return 0;
  const hrs = bookingHours(startsAt, endsAt);
  const rate = toNum(ratePence);
  let base: number;
  if (unit === 'hour') base = rate * hrs;
  else if (unit === 'annual') base = (rate / WORKING_DAYS_PER_YEAR) * (hrs / WORKING_DAY_HOURS);
  else base = rate * (hrs / WORKING_DAY_HOURS);
  return Math.round(base * (1 + toNum(onCostPercent) / 100));
}

/** Which cost bucket a resource's scheduled time lands in on the margin view. */
export function resourceKindToCostCategory(kind: ResourceKind): CostCategory {
  if (kind === 'subcontractor') return 'subcontractor';
  if (kind === 'plant') return 'plant_hire';
  return 'labour';
}

/**
 * Sum scheduled assignments into a total and a per-cost-category breakdown,
 * so a project's scheduled labour/subbie cost can be shown on its dashboard
 * and added into the margin view. Pass each assignment's resource kind.
 */
export function summariseScheduledCost(
  rows: { cost_pence: number | null; kind: ResourceKind }[],
): { total_pence: number; by_category: Partial<Record<CostCategory, number>> } {
  const by_category: Partial<Record<CostCategory, number>> = {};
  let total = 0;
  for (const r of rows) {
    const amt = toNum(r.cost_pence);
    total += amt;
    const cat = resourceKindToCostCategory(r.kind);
    by_category[cat] = (by_category[cat] ?? 0) + amt;
  }
  return { total_pence: total, by_category };
}
