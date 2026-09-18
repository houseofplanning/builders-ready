/**
 * Zod schemas for form/IO validation across mobile + web.
 *
 * Keep these aligned with the SQL constraints in supabase/migrations/.
 * If a constraint exists in the DB, it should usually exist here too.
 */

import { z } from 'zod';

// --- shared atoms ----------------------------------------------------------

export const uuid = z.string().uuid();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
export const email = z.string().email().max(255);

export const slug = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/, {
    message: 'lowercase letters, digits and hyphens; cannot start or end with a hyphen',
  });

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected #RRGGBB');

export const ukPostcode = z
  .string()
  .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'UK postcode');

// --- tenant onboarding ----------------------------------------------------

export const tenantSignup = z.object({
  business_name: z.string().min(2).max(200),
  email,
  password: z.string().min(8).max(72),
  tier: z.enum(['starter', 'pro', 'unlimited']),
});
export type TenantSignupInput = z.infer<typeof tenantSignup>;

export const tenantBranding = z.object({
  slug,
  logo_url: z.string().url().nullable().optional(),
  brand_primary: hexColor,
  brand_accent: hexColor,
});
export type TenantBrandingInput = z.infer<typeof tenantBranding>;

export const tenantBank = z.object({
  bank_name: z.string().max(120).nullable(),
  bank_account_name: z.string().max(200).nullable(),
  bank_sort_code: z
    .string()
    .regex(/^\d{2}-?\d{2}-?\d{2}$/, 'NN-NN-NN')
    .nullable(),
  bank_account_number: z.string().regex(/^\d{6,8}$/).nullable(),
  vat_number: z.string().max(40).nullable(),
  company_number: z.string().max(40).nullable(),
});
export type TenantBankInput = z.infer<typeof tenantBank>;

// --- invitations ----------------------------------------------------------

export const invitationCreate = z.object({
  email,
  role: z.enum(['pm', 'client']),
});
export type InvitationCreateInput = z.infer<typeof invitationCreate>;

export const invitationAccept = z.object({
  token: z.string().min(32).max(128),
  full_name: z.string().min(2).max(120),
  password: z.string().min(8).max(72),
});
export type InvitationAcceptInput = z.infer<typeof invitationAccept>;

// --- projects -------------------------------------------------------------

export const projectCreate = z.object({
  name: z.string().min(2).max(200),
  address_line1: z.string().min(2).max(200),
  address_line2: z.string().max(200).nullable().optional(),
  city: z.string().min(1).max(80),
  postcode: ukPostcode,
  client_id: uuid,
  pm_id: uuid,
  start_date: isoDate,
  estimated_end_date: isoDate,
  /** Original quote in integer pence. Optional; captured at project creation
   *  for the quote-vs-final finance summary and the handover PDF. */
  quoted_amount_pence: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
});
export type ProjectCreateInput = z.infer<typeof projectCreate>;

// --- decisions / variations ----------------------------------------------

export const decisionCreate = z.object({
  project_id: uuid,
  title: z.string().min(2).max(200),
  description: z.string().max(2000).nullable().optional(),
  deadline: isoDate.nullable().optional(),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        description: z.string().max(500).nullable().optional(),
        price_gbp_pence: z.number().int().nonnegative().nullable().optional(),
        photo_storage_path: z.string().nullable().optional(),
      }),
    )
    .min(2)
    .max(6),
});
export type DecisionCreateInput = z.infer<typeof decisionCreate>;

export const variationCreate = z.object({
  project_id: uuid,
  number: z.string().min(1).max(40),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).nullable().optional(),
  delta_amount_gbp_pence: z.number().int(),
  delta_days: z.number().int().default(0),
});
export type VariationCreateInput = z.infer<typeof variationCreate>;

// --- estimates / quotes ---------------------------------------------------

// NB: the `EstimateLineKind` and `VatMode` string-union types live in
// types.ts (the canonical row types). These zod enums validate the same
// values for IO; we deliberately don't re-export types of the same name here,
// to avoid an ambiguous double-export through the package barrel.
export const estimateLineKind = z.enum([
  'material',
  'labour_day_rate',
  'labour_hourly',
  'fixed',
  'other',
]);

export const vatMode = z.enum(['none', 'standard', 'reverse_charge']);

/** A single cost build-up line. A saved rate only prefills these values;
 *  every field stays editable, and a line can be free-typed with no rate. */
export const estimateLineInput = z.object({
  kind: estimateLineKind.default('material'),
  saved_rate_id: uuid.nullable().optional(),
  description: z.string().min(1).max(300),
  quantity: z.number().nonnegative().default(1),
  unit: z.string().min(1).max(20).default('each'),
  /** Builder's cost per unit, integer pence. */
  unit_cost_pence: z.number().int().nonnegative().default(0),
  /** Markup on cost, percent. 20 => client price is cost x 1.20. */
  markup_percent: z.number().nonnegative().max(1000).default(0),
});
export type EstimateLineInput = z.infer<typeof estimateLineInput>;

export const estimateCreate = z.object({
  title: z.string().min(2).max(200),
  client_name: z.string().min(1).max(200),
  client_email: email.nullable().optional(),
  client_phone: z.string().max(40).nullable().optional(),
  site_address_line1: z.string().max(200).nullable().optional(),
  site_address_line2: z.string().max(200).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  // Lenient on purpose: the site address is optional on a quote, so a partial
  // or blank postcode must never block saving. Strict validation happens later,
  // at project conversion, where the address becomes authoritative.
  postcode: z.string().max(12).nullable().optional(),
  vat_mode: vatMode.default('none'),
  /** Basis points; 2000 = 20.00%. Only applied when vat_mode is 'standard'. */
  vat_rate_bp: z.number().int().min(0).max(10000).default(2000),
  valid_until: isoDate.nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  terms: z.string().max(4000).nullable().optional(),
  lines: z.array(estimateLineInput).min(1).max(200),
});
export type EstimateCreateInput = z.infer<typeof estimateCreate>;

export const savedRateInput = z.object({
  kind: estimateLineKind.default('material'),
  description: z.string().min(1).max(300),
  unit: z.string().min(1).max(20).default('each'),
  default_unit_cost_pence: z.number().int().nonnegative().default(0),
  default_markup_percent: z.number().nonnegative().max(1000).default(0),
});
export type SavedRateInput = z.infer<typeof savedRateInput>;
