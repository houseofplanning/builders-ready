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
  password: z.string().min(12).max(72),
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
  password: z.string().min(12).max(72),
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
