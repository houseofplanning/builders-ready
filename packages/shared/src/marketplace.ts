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
    postcode: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .transform((s) => s.toUpperCase()),
    budget_min_pence: pence.optional().nullable(),
    budget_max_pence: pence.optional().nullable(),
    budget_note: z.string().trim().max(200).optional().nullable(),
    photos: z.array(z.string()).max(8).optional(),
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
