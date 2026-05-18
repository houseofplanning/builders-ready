-- =========================================================================
-- Builders Ready — Migration 2/9: tenants, members, invitations
-- =========================================================================

-- -------------------------------------------------------------------------
-- tenants — the root of the multi-tenant model
-- -------------------------------------------------------------------------
create table if not exists public.tenants (
  id                       uuid primary key default gen_random_uuid(),
  slug                     citext not null unique,
  name                     text not null,
  logo_url                 text,
  brand_primary            text not null default '#0F4C5C',
  brand_accent             text not null default '#E07A5F',
  business_email           text not null,
  business_phone           text,
  company_number           text,
  vat_number               text,
  bank_name                text,
  bank_account_name        text,
  bank_sort_code           text,
  bank_account_number      text,
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  subscription_tier        public.subscription_tier,
  subscription_status      public.subscription_status,
  trial_ends_at            timestamptz,
  current_period_end       timestamptz,
  owner_user_id            uuid not null references auth.users(id) on delete restrict,
  status                   text not null default 'active'
                            check (status in ('active','suspended','archived')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint tenants_slug_format check (
    slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'
  ),
  constraint tenants_brand_primary_hex check (brand_primary ~ '^#[0-9a-fA-F]{6}$'),
  constraint tenants_brand_accent_hex  check (brand_accent  ~ '^#[0-9a-fA-F]{6}$')
);

create index if not exists tenants_subscription_idx
  on public.tenants(subscription_status);
create index if not exists tenants_status_idx on public.tenants(status);

-- -------------------------------------------------------------------------
-- tenant_members — membership join
-- v1 invariant: a user belongs to exactly one tenant (unique on user_id).
-- -------------------------------------------------------------------------
create table if not exists public.tenant_members (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade unique,
  role        public.tenant_member_role not null,
  invited_by  uuid references auth.users(id),
  invited_at  timestamptz,
  joined_at   timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_tenant_idx
  on public.tenant_members(tenant_id);
create index if not exists tenant_members_role_idx
  on public.tenant_members(tenant_id, role);

-- -------------------------------------------------------------------------
-- platform_admins — Builders Ready operators (separate from tenant roles)
-- -------------------------------------------------------------------------
create table if not exists public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- invitations — email-link tokens for inviting PMs and clients
-- -------------------------------------------------------------------------
create table if not exists public.invitations (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  email               citext not null,
  role                public.tenant_member_role not null
                        check (role in ('pm','client')),
  invited_by          uuid not null references auth.users(id) on delete restrict,
  token               text not null unique,
  expires_at          timestamptz not null default (now() + interval '7 days'),
  accepted_at         timestamptz,
  accepted_via_email  citext,
  created_at          timestamptz not null default now()
);

create index if not exists invitations_pending_email_idx
  on public.invitations(email) where accepted_at is null;
create index if not exists invitations_tenant_idx
  on public.invitations(tenant_id, created_at desc);

-- -------------------------------------------------------------------------
-- touch_updated_at trigger helper (referenced by later migrations too)
-- -------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenants_touch on public.tenants;
create trigger tenants_touch
  before update on public.tenants
  for each row execute procedure public.touch_updated_at();
