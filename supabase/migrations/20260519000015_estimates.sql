-- =========================================================================
-- Builders Ready — Migration 15: estimates / quotes (on-site estimator)
-- =========================================================================
-- Standalone estimates: a builder quotes a PROSPECT before any project or
-- client exists in the app. project_id stays NULL until the estimate is
-- accepted and explicitly converted into a project (see convert flow, Phase 4).
--
-- Money is integer pence (bigint), matching invoices/variations. Line totals
-- are DB-generated from quantity x unit_cost x markup so the app can never
-- drift from the stored figures. Cost AND price are captured per line so
-- margin tracking (roadmap feature 3) falls out for free later.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------------------
do $$ begin
  create type public.estimate_status as enum (
    'draft','sent','accepted','declined','expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estimate_line_kind as enum (
    'material','labour_day_rate','labour_hourly','fixed','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vat_mode as enum (
    'none','standard','reverse_charge'
  );
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- saved_rates — reusable materials / labour price library (tenant-scoped)
-- A rate only PREFILLS a line; every value stays editable on the estimate,
-- and lines can be free-typed without a rate at all.
-- -------------------------------------------------------------------------
create table if not exists public.saved_rates (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants(id) on delete cascade,
  kind                     public.estimate_line_kind not null default 'material',
  description              text not null,
  unit                     text not null default 'each',
  default_unit_cost_pence  bigint not null default 0 check (default_unit_cost_pence >= 0),
  default_markup_percent   numeric(6,2) not null default 0 check (default_markup_percent >= 0),
  position                 smallint not null default 0,
  active                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists saved_rates_tenant_idx
  on public.saved_rates(tenant_id, active, position);

drop trigger if exists saved_rates_touch on public.saved_rates;
create trigger saved_rates_touch
  before update on public.saved_rates
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- estimates
-- -------------------------------------------------------------------------
create table if not exists public.estimates (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  created_by           uuid not null references public.profiles(id) on delete restrict,
  number               text not null,
  title                text not null,

  -- Prospect details captured inline (they are not app users yet).
  client_name          text not null,
  client_email         text,
  client_phone         text,
  site_address_line1   text,
  site_address_line2   text,
  city                 text,
  postcode             text,

  -- NULL until the estimate is won and converted into a project.
  project_id           uuid references public.projects(id) on delete set null,

  status               public.estimate_status not null default 'draft',

  -- VAT handling. vat_rate_bp is basis points (2000 = 20.00%); only applied
  -- when vat_mode = 'standard'. 'reverse_charge' shows the CIS wording and
  -- adds no VAT to the total.
  vat_mode             public.vat_mode not null default 'none',
  vat_rate_bp          integer not null default 2000 check (vat_rate_bp between 0 and 10000),

  -- Stored money summary (computed by the app from the line items).
  cost_subtotal_pence  bigint not null default 0 check (cost_subtotal_pence >= 0),
  subtotal_pence       bigint not null default 0 check (subtotal_pence >= 0),
  vat_pence            bigint not null default 0 check (vat_pence >= 0),
  total_pence          bigint not null default 0 check (total_pence >= 0),

  valid_until          date,
  notes                text,
  terms                text,

  sent_at              timestamptz,
  accepted_at          timestamptz,
  accepted_by          uuid references public.profiles(id),
  client_signature     text,
  -- Opaque token for the shareable acceptance link (prospects with no account).
  accept_token         text unique,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tenant_id, number)
);

create index if not exists estimates_tenant_idx
  on public.estimates(tenant_id, status, created_at desc);
create index if not exists estimates_project_idx
  on public.estimates(tenant_id, project_id);

drop trigger if exists estimates_touch on public.estimates;
create trigger estimates_touch
  before update on public.estimates
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- estimate_line_items — the cost build-up
-- -------------------------------------------------------------------------
create table if not exists public.estimate_line_items (
  id               uuid primary key default gen_random_uuid(),
  estimate_id      uuid not null references public.estimates(id) on delete cascade,
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  -- Where the line came from, if a saved rate was used. Nulled if that rate
  -- is later deleted; the line keeps its own values regardless.
  saved_rate_id    uuid references public.saved_rates(id) on delete set null,
  position         smallint not null default 0,
  kind             public.estimate_line_kind not null default 'material',
  description      text not null,
  quantity         numeric(12,2) not null default 1 check (quantity >= 0),
  unit             text not null default 'each',
  unit_cost_pence  bigint not null default 0 check (unit_cost_pence >= 0),
  markup_percent   numeric(6,2) not null default 0 check (markup_percent >= 0),
  -- Generated so the DB is the single source of truth for the maths.
  line_cost_pence  bigint generated always as
                     (round(quantity * unit_cost_pence)::bigint) stored,
  line_price_pence bigint generated always as
                     (round(quantity * unit_cost_pence * (1 + markup_percent / 100))::bigint) stored,
  created_at       timestamptz not null default now()
);

create index if not exists estimate_line_items_idx
  on public.estimate_line_items(estimate_id, position);

-- -------------------------------------------------------------------------
-- tenant-id integrity guard for line items (parent is an estimate, not a
-- project, so the shared assert_tenant_match() doesn't cover it).
-- -------------------------------------------------------------------------
create or replace function public.assert_estimate_line_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent_tenant uuid;
begin
  select tenant_id into parent_tenant from public.estimates where id = new.estimate_id;
  if parent_tenant is null then
    raise exception 'assert_estimate_line_tenant: parent estimate not found';
  end if;
  if new.tenant_id is null then
    new.tenant_id := parent_tenant;
  elsif new.tenant_id <> parent_tenant then
    raise exception 'tenant_id mismatch on estimate_line_items: row=% parent=%',
      new.tenant_id, parent_tenant using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists estimate_line_items_tenant_match on public.estimate_line_items;
create trigger estimate_line_items_tenant_match
  before insert or update on public.estimate_line_items
  for each row execute procedure public.assert_estimate_line_tenant();

-- -------------------------------------------------------------------------
-- RLS — estimates live pre-project, so access is tenant/role based, not
-- project based. Owners see the whole tenant's estimates; a PM manages the
-- ones they created. Clients do not read estimates directly here — prospect
-- acceptance goes through a tokenised server path (Phase 3/4).
-- -------------------------------------------------------------------------
alter table public.saved_rates          enable row level security;
alter table public.estimates            enable row level security;
alter table public.estimate_line_items  enable row level security;

-- saved_rates ---------------------------------------------------------------
drop policy if exists saved_rates_read on public.saved_rates;
create policy saved_rates_read on public.saved_rates
  for select using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm'))
  );

drop policy if exists saved_rates_write on public.saved_rates;
create policy saved_rates_write on public.saved_rates
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and public.current_user_role() in ('owner','pm')
    )
  ) with check (tenant_id = public.current_user_tenant_id());

-- estimates -----------------------------------------------------------------
drop policy if exists estimates_read on public.estimates;
create policy estimates_read on public.estimates
  for select using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm'))
  );

drop policy if exists estimates_write on public.estimates;
create policy estimates_write on public.estimates
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (public.current_user_role() = 'owner' or created_by = auth.uid())
    )
  ) with check (tenant_id = public.current_user_tenant_id());

-- estimate_line_items -------------------------------------------------------
drop policy if exists estimate_line_items_read on public.estimate_line_items;
create policy estimate_line_items_read on public.estimate_line_items
  for select using (
    public.is_platform_admin()
    or exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and e.tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm')
    )
  );

drop policy if exists estimate_line_items_write on public.estimate_line_items;
create policy estimate_line_items_write on public.estimate_line_items
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.estimates e
      where e.id = estimate_id
        and e.tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(e.tenant_id)
        and (public.current_user_role() = 'owner' or e.created_by = auth.uid())
    )
  ) with check (tenant_id = public.current_user_tenant_id());
