import { z } from 'zod';

// ---------------------------------------------------------------------------
// Trade categories — used for posting a job and filtering the Find Work feed.
// Kept as a flat list (not a DB table) so it ships with the client; stored as
// text on job_requests.trade_category.
// ---------------------------------------------------------------------------
export const TRADE_CATEGORIES = [
  'General building',
  'Extensions',
  'Loft conversions',
  'Full renovations',
  'Plumbing',
  'Heating & gas',
  'Electrical',
  'Bathrooms',
  'Kitchens',
  'Carpentry & joinery',
  'Plastering',
  'Painting & decorating',
  'Tiling',
  'Flooring',
  'Roofing',
  'Bricklaying',
  'Windows & doors',
  'Landscaping & gardens',
  'Driveways & paving',
  'Groundworks',
  'Other',
] as const;

export type TradeCategory = (typeof TRADE_CATEGORIES)[number];

/** Max live quotes a job accepts before it closes to new bids. */
export const MARKETPLACE_BID_CAP = 5;

/**
 * The postcode district (outward code) of a UK postcode — e.g. "SW19 8HP" →
 * "SW19", "M1 1AA" → "M1", "EC1A 1BB" → "EC1A". The inward code is always the
 * last 3 characters, so the district is everything before that. Used for the
 * marketplace area filter so it matches the exact postcode posted, UK-wide.
 */
export function postcodeDistrict(postcode?: string | null): string {
  const pc = (postcode ?? '').toUpperCase().replace(/\s+/g, '');
  if (pc.length <= 3) return pc;
  return pc.slice(0, pc.length - 3);
}

/**
 * Whether a job's postcode matches a free-text postcode search. The search is
 * a prefix match on the normalised postcode (spaces/case ignored), so "SW",
 * "SW19", "SW198HP" and "sw19 8hp" all match "SW19 8HP". An empty query matches
 * everything. Used by the marketplace postcode search box, UK-wide.
 */
export function postcodeMatches(postcode: string | null | undefined, query: string): boolean {
  const q = (query ?? '').toUpperCase().replace(/\s+/g, '').trim();
  if (!q) return true;
  const pc = (postcode ?? '').toUpperCase().replace(/\s+/g, '');
  return pc.startsWith(q);
}

/** How soon the customer needs the work done. */
export const JOB_TIMING_OPTIONS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'within_a_week', label: 'Within a week' },
  { value: 'within_a_month', label: 'Within a month' },
  { value: 'within_3_months', label: 'Within 3 months' },
  { value: 'flexible', label: "I'm flexible / planning ahead" },
] as const;

/** Type of property the work is at. */
export const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat / apartment' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
] as const;

export function jobTimingLabel(v?: string | null): string | null {
  return JOB_TIMING_OPTIONS.find((o) => o.value === v)?.label ?? null;
}
export function propertyTypeLabel(v?: string | null): string | null {
  return PROPERTY_TYPES.find((o) => o.value === v)?.label ?? null;
}

/** UK postcode area codes (the leading letters of a postcode), for the
 *  marketplace area filter dropdown. */
export const UK_POSTCODE_AREAS = [
  'AB', 'AL', 'B', 'BA', 'BB', 'BD', 'BH', 'BL', 'BN', 'BR', 'BS', 'BT',
  'CA', 'CB', 'CF', 'CH', 'CM', 'CO', 'CR', 'CT', 'CV', 'CW',
  'DA', 'DD', 'DE', 'DG', 'DH', 'DL', 'DN', 'DT', 'DY',
  'E', 'EC', 'EH', 'EN', 'EX', 'FK', 'FY',
  'G', 'GL', 'GU', 'GY', 'HA', 'HD', 'HG', 'HP', 'HR', 'HS', 'HU', 'HX',
  'IG', 'IM', 'IP', 'IV', 'JE', 'KA', 'KT', 'KW', 'KY',
  'L', 'LA', 'LD', 'LE', 'LL', 'LN', 'LS', 'LU',
  'M', 'ME', 'MK', 'ML', 'N', 'NE', 'NG', 'NN', 'NP', 'NR', 'NW',
  'OL', 'OX', 'PA', 'PE', 'PH', 'PL', 'PO', 'PR',
  'RG', 'RH', 'RM', 'S', 'SA', 'SE', 'SG', 'SK', 'SL', 'SM', 'SN', 'SO', 'SP', 'SR', 'SS', 'ST', 'SW', 'SY',
  'TA', 'TD', 'TF', 'TN', 'TQ', 'TR', 'TS', 'TW',
  'UB', 'W', 'WA', 'WC', 'WD', 'WF', 'WN', 'WR', 'WS', 'WV', 'YO', 'ZE',
] as const;

// ---------------------------------------------------------------------------
// Status unions (mirror the Postgres enums)
// ---------------------------------------------------------------------------
export type JobRequestStatus = 'open' | 'matched' | 'closed' | 'expired' | 'cancelled';
export type BidStatus = 'submitted' | 'shortlisted' | 'accepted' | 'declined' | 'withdrawn';
export type ReviewDirection = 'customer_to_trade' | 'trade_to_customer';

// ---------------------------------------------------------------------------
// Row interfaces
// ---------------------------------------------------------------------------
export interface JobRequest {
  id: string;
  customer_id: string;
  trade_category: string;
  title: string;
  description: string | null;
  address_line1: string | null;
  city: string | null;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  budget_min_pence: number | null;
  budget_max_pence: number | null;
  budget_note: string | null;
  photos: string[];
  status: JobRequestStatus;
  matched_project_id: string | null;
  matched_bid_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface Bid {
  id: string;
  job_request_id: string;
  tenant_id: string;
  created_by: string;
  amount_pence: number | null;
  message: string | null;
  estimate_id: string | null;
  status: BidStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceThread {
  id: string;
  job_request_id: string;
  customer_id: string;
  tenant_id: string;
  created_at: string;
  last_message_at: string | null;
}

export interface MarketplaceMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MarketplaceReview {
  id: string;
  project_id: string;
  tenant_id: string;
  reviewer_id: string;
  reviewee_id: string;
  direction: ReviewDirection;
  rating: number;
  body: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Zod schemas (input validation for server actions / API)
// ---------------------------------------------------------------------------
const pence = z.number().int().nonnegative();

export const jobRequestCreate = z
  .object({
    trade_category: z.enum(TRADE_CATEGORIES as unknown as [TradeCategory, ...TradeCategory[]]),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(4000).optional().nullable(),
    address_line1: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().max(120).optional().nullable(),
    // A real UK postcode so the area filter/search derives the district
    // correctly (a garbage value like "LONDON" would mis-derive and make the
    // job unfindable by nearby trades).
    postcode: z
      .string()
      .trim()
      .max(10)
      .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'Enter a valid UK postcode')
      .transform((s) => s.toUpperCase()),
    budget_min_pence: pence.optional().nullable(),
    budget_max_pence: pence.optional().nullable(),
    budget_note: z.string().trim().max(200).optional().nullable(),
    photos: z.array(z.string()).max(8).optional(),
    timing: z.string().trim().max(40).optional().nullable(),
    property_type: z.string().trim().max(40).optional().nullable(),
    preferred_start_date: z.string().trim().max(20).optional().nullable(),
    access_notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (v) =>
      v.budget_min_pence == null ||
      v.budget_max_pence == null ||
      v.budget_max_pence >= v.budget_min_pence,
    { message: 'Max budget must be at least the min budget.', path: ['budget_max_pence'] },
  );

export type JobRequestCreate = z.infer<typeof jobRequestCreate>;

export const bidCreate = z.object({
  job_request_id: z.string().uuid(),
  amount_pence: z.number().int().positive().optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  estimate_id: z.string().uuid().optional().nullable(),
  available_from: z.string().trim().max(80).optional().nullable(),
  duration_estimate: z.string().trim().max(80).optional().nullable(),
  warranty: z.string().trim().max(200).optional().nullable(),
  about: z.string().trim().max(300).optional().nullable(),
});
export type BidCreate = z.infer<typeof bidCreate>;

export const messageCreate = z.object({
  thread_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});
export type MessageCreate = z.infer<typeof messageCreate>;

export const reviewCreate = z.object({
  project_id: z.string().uuid(),
  reviewee_id: z.string().uuid(),
  direction: z.enum(['customer_to_trade', 'trade_to_customer']),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().nullable(),
});
export type ReviewCreate = z.infer<typeof reviewCreate>;

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
export function jobRequestStatusLabel(s: JobRequestStatus): string {
  return {
    open: 'Open',
    matched: 'Hired',
    closed: 'Closed',
    expired: 'Expired',
    cancelled: 'Cancelled',
  }[s];
}

/** Compact budget string from pence bounds, e.g. "£2,000–£3,000", "From £500", "£1,200". */
export function budgetLabel(
  minPence: number | null,
  maxPence: number | null,
  note?: string | null,
): string {
  const f = (p: number) => `£${Math.round(p / 100).toLocaleString('en-GB')}`;
  if (minPence != null && maxPence != null) {
    return minPence === maxPence ? f(minPence) : `${f(minPence)}–${f(maxPence)}`;
  }
  if (minPence != null) return `From ${f(minPence)}`;
  if (maxPence != null) return `Up to ${f(maxPence)}`;
  return note?.trim() || 'Open to quotes';
}
