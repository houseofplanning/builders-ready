/**
 * Hand-rolled domain types for Builders Ready.
 *
 * After `pnpm supabase:gen-types` the auto-generated `database.types.ts`
 * sits alongside these — the types below are the stable, semantically
 * named surface the app code uses.
 */

import type { StageStatus } from './theme';

export type UUID = string;
export type ISODateTime = string;
export type ISODate = string;

// --- tenancy ---------------------------------------------------------------

export type TenantMemberRole = 'owner' | 'pm' | 'client';

export type SubscriptionTier = 'starter' | 'pro' | 'unlimited';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'unpaid'
  | 'suspended';

export interface Tenant {
  id: UUID;
  slug: string;
  name: string;
  logo_url: string | null;
  brand_primary: string;
  brand_accent: string;
  business_email: string;
  business_phone: string | null;
  company_number: string | null;
  vat_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_tier: SubscriptionTier | null;
  subscription_status: SubscriptionStatus | null;
  trial_ends_at: ISODateTime | null;
  current_period_end: ISODateTime | null;
  owner_user_id: UUID;
  status: 'active' | 'suspended' | 'archived';
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface TenantMember {
  tenant_id: UUID;
  user_id: UUID;
  role: TenantMemberRole;
  invited_by: UUID | null;
  invited_at: ISODateTime | null;
  joined_at: ISODateTime;
}

export interface Invitation {
  id: UUID;
  tenant_id: UUID;
  email: string;
  role: TenantMemberRole;
  invited_by: UUID;
  token: string;
  expires_at: ISODateTime;
  accepted_at: ISODateTime | null;
  accepted_via_email: string | null;
  created_at: ISODateTime;
}

// --- profile (1:1 with auth.users) ----------------------------------------

export interface Profile {
  id: UUID;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: ISODateTime;
}

// --- projects --------------------------------------------------------------

export interface Project {
  id: UUID;
  tenant_id: UUID;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  client_id: UUID;
  pm_id: UUID;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  start_date: ISODate;
  estimated_end_date: ISODate;
  actual_end_date: ISODate | null;
  progress_percent: number;
  current_stage_id: UUID | null;
  planning_application_id: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface ProjectStage {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID;
  position: number;
  name: string;
  status: StageStatus;
  start_date: ISODate;
  target_end_date: ISODate;
  actual_end_date: ISODate | null;
  pm_commentary: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface ProjectUpdate {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID;
  stage_id: UUID;
  posted_by: UUID;
  headline: string | null;
  body: string;
  decision_needed: string | null;
  posted_at: ISODateTime;
}

export interface UpdatePhoto {
  id: UUID;
  tenant_id: UUID;
  update_id: UUID;
  storage_path: string;
  width: number;
  height: number;
  byte_size: number;
  position: number;
  created_at: ISODateTime;
}

export interface Report {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID;
  posted_by: UUID;
  title: string;
  kind: 'pdf' | 'structured';
  pdf_storage_path: string | null;
  summary: string | null;
  next_week: string | null;
  risks: string | null;
  decisions_needed: string | null;
  posted_at: ISODateTime;
  acknowledged_at: ISODateTime | null;
  acknowledged_by: UUID | null;
}

export interface Message {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID;
  sender_id: UUID;
  body: string;
  read_at: ISODateTime | null;
  sent_at: ISODateTime;
}

export type NotificationKind =
  | 'update_posted'
  | 'stage_advanced'
  | 'report_posted'
  | 'message_received'
  | 'decision_needed'
  | 'invoice_sent'
  | 'invoice_overdue'
  | 'invoice_paid'
  | 'decision_raised'
  | 'decision_decided'
  | 'variation_proposed'
  | 'variation_decided'
  | 'trial_ending'
  | 'billing_past_due';

export interface Notification {
  id: UUID;
  tenant_id: UUID;
  user_id: UUID;
  project_id: UUID | null;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  read_at: ISODateTime | null;
  created_at: ISODateTime;
}

// --- billing ---------------------------------------------------------------

export interface Invoice {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID;
  created_by: UUID;
  number: string;
  title: string;
  description: string | null;
  amount_gbp_pence: number;
  issued_at: ISODate;
  due_at: ISODate;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: ISODateTime | null;
  paid_reference: string | null;
  paid_marked_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// --- decisions / variations (BR v1 differentiators) -----------------------

export type DecisionStatus = 'open' | 'accepted' | 'rejected' | 'expired';

export interface Decision {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID;
  raised_by: UUID;
  title: string;
  description: string | null;
  deadline: ISODate | null;
  status: DecisionStatus;
  selected_option_id: UUID | null;
  decided_at: ISODateTime | null;
  decided_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DecisionOption {
  id: UUID;
  decision_id: UUID;
  tenant_id: UUID;
  label: string;
  description: string | null;
  price_gbp_pence: number | null;
  photo_storage_path: string | null;
  position: number;
}

export type VariationStatus = 'proposed' | 'accepted' | 'rejected' | 'cancelled';

export interface Variation {
  id: UUID;
  tenant_id: UUID;
  project_id: UUID;
  proposed_by: UUID;
  number: string;
  title: string;
  description: string | null;
  delta_amount_gbp_pence: number;
  delta_days: number;
  status: VariationStatus;
  decided_at: ISODateTime | null;
  decided_by: UUID | null;
  client_signature: string | null;
  created_at: ISODateTime;
}

// --- composite types used in UI -------------------------------------------

export interface ProjectFinance {
  project_id: UUID;
  tenant_id: UUID;
  variations_pence: number;
  invoiced_pence: number;
  paid_pence: number;
  open_decisions: number;
}

export interface ProjectWithDetail extends Project {
  client: Profile;
  pm: Profile;
  stages: ProjectStage[];
  current_stage: ProjectStage | null;
}

export interface UpdateWithPhotos extends ProjectUpdate {
  photos: UpdatePhoto[];
  posted_by_profile: Profile;
}
