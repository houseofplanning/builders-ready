-- Stripe Connect foundation.
--
-- Each tenant (builder) is a Stripe Connect Express connected account so their
-- clients can pay milestone invoices into the builder's own bank, with Builders
-- Ready taking a flat application fee (see platformFeePence in @br/shared).
--
-- These columns are written only by the server (service role, via the Connect
-- server actions and the account.updated webhook). Owners can read them to see
-- their payout status; the values are not secret but are builder-scoped by the
-- existing tenants RLS.

alter table public.tenants
  add column if not exists stripe_connect_account_id text unique,
  add column if not exists connect_charges_enabled boolean not null default false,
  add column if not exists connect_payouts_enabled boolean not null default false,
  add column if not exists connect_details_submitted boolean not null default false,
  add column if not exists connect_onboarded_at timestamptz;

comment on column public.tenants.stripe_connect_account_id is
  'Stripe Connect (Express) connected account id, e.g. acct_...';
comment on column public.tenants.connect_charges_enabled is
  'Mirror of Stripe account.charges_enabled — can this builder take payments yet.';
comment on column public.tenants.connect_payouts_enabled is
  'Mirror of Stripe account.payouts_enabled — can Stripe pay out to their bank.';
comment on column public.tenants.connect_details_submitted is
  'Mirror of Stripe account.details_submitted — has onboarding been completed.';
