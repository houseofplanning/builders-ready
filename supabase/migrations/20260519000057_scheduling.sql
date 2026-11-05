-- =========================================================================
-- Builders Ready — Migration 57: scheduling & resource management (Phase 1)
-- =========================================================================
-- DRAFT for review — see docs/SCHEDULING-SPEC.md. Do not apply to production
-- until the data model is signed off.
--
-- Adds the two core objects scheduling needs:
--   resources   — anyone/anything you can put on a job (staff, operative,
--                 subcontractor), with a cost-to-business rate. Some resources
--                 also log in (user_id) for the crew mobile schedule.
--   assignments — a resource booked on a project (optionally a stage) for a
--                 time range; the booking bar in the scheduler and the
--                 "who's on it" on the per-project dashboard. Carries a
--                 computed cost (rate x duration) so margin is instant.
--
-- SENSITIVE: rates, assignment cost and margin are OWNER/PM ONLY, like
-- project_costs. Clients get no policy. Crew (a resource's linked login) may
-- read their OWN assignments only (for the mobile schedule).
--
-- Money is integer pence. A day rate is pro-rated against an 8-hour working
-- day (8h booked = 1x day rate); hour rate is literal hours.
-- =========================================================================

-- --- enums ---------------------------------------------------------------
do $$ begin
  create type public.resource_kind as enum ('staff','operative','subcontractor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rate_unit as enum ('day','hour');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_kind as enum ('work','travel','leave','unplanned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_status as enum
    ('planned','confirmed','in_progress','done','cancelled');
exception when duplicate_object then null; end $$;

-- NOTE: the 'assignment_changed' notification_kind is added in the later
-- crew-notifications slice (P1d), not here. ALTER TYPE ... ADD VALUE does not
-- play nicely inside a migration transaction, and nothing in this foundation
-- migration needs it yet.

-- --- resources -----------------------------------------------------------
create table if not exists public.resources (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  kind                  public.resource_kind not null default 'operative',
  display_name          text not null,
  user_id               uuid references auth.users(id) on delete set null,     -- logs in (mobile)
  member_user_id        uuid references auth.users(id) on delete set null,     -- is a tenant_member (owner/PM)
  trade                 text,
  marketplace_tenant_id uuid references public.tenants(id) on delete set null, -- optional link to a marketplace trade
  phone                 text,
  email                 text,
  cost_rate_pence       bigint check (cost_rate_pence is null or cost_rate_pence >= 0),
  cost_rate_unit        public.rate_unit not null default 'day',
  colour                text,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists resources_tenant_idx on public.resources(tenant_id, active);
create index if not exists resources_user_idx on public.resources(user_id) where user_id is not null;

drop trigger if exists resources_touch on public.resources;
create trigger resources_touch
  before update on public.resources
  for each row execute procedure public.touch_updated_at();

-- --- assignments ---------------------------------------------------------
create table if not exists public.assignments (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  stage_id      uuid references public.project_stages(id) on delete set null,
  resource_id   uuid not null references public.resources(id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  booking_kind  public.booking_kind not null default 'work',
  status        public.assignment_status not null default 'planned',
  note          text,
  cost_pence    bigint,  -- computed from resource rate x duration (see trigger)
  created_by    uuid not null references public.profiles(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists assignments_resource_time_idx
  on public.assignments(tenant_id, resource_id, starts_at);
create index if not exists assignments_project_idx
  on public.assignments(tenant_id, project_id, starts_at);
create index if not exists assignments_stage_idx
  on public.assignments(stage_id) where stage_id is not null;

drop trigger if exists assignments_touch on public.assignments;
create trigger assignments_touch
  before update on public.assignments
  for each row execute procedure public.touch_updated_at();

-- --- tenant-id integrity guard (parent is a project) ---------------------
create or replace function public.assert_assignment_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare parent_tenant uuid;
begin
  select tenant_id into parent_tenant from public.projects where id = new.project_id;
  if parent_tenant is null then
    raise exception 'assert_assignment_tenant: parent project not found';
  end if;
  if new.tenant_id is null then
    new.tenant_id := parent_tenant;
  elsif new.tenant_id <> parent_tenant then
    raise exception 'tenant_id mismatch on assignments: row=% parent=%',
      new.tenant_id, parent_tenant using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists assignments_tenant_match on public.assignments;
create trigger assignments_tenant_match
  before insert or update on public.assignments
  for each row execute procedure public.assert_assignment_tenant();

revoke execute on function public.assert_assignment_tenant() from anon, authenticated, public;

-- --- cost compute: rate x duration (pence), 8h working day for day rate ---
create or replace function public.compute_assignment_cost()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hrs numeric;
  rate bigint;
  unit public.rate_unit;
begin
  select cost_rate_pence, cost_rate_unit into rate, unit
    from public.resources where id = new.resource_id;

  if rate is null or new.booking_kind = 'leave' then
    new.cost_pence := 0;
    return new;
  end if;

  hrs := extract(epoch from (new.ends_at - new.starts_at)) / 3600.0;
  if unit = 'hour' then
    new.cost_pence := round(rate * hrs);
  else -- 'day', pro-rated against an 8h working day
    new.cost_pence := round(rate * (hrs / 8.0));
  end if;
  return new;
end $$;

drop trigger if exists assignments_cost on public.assignments;
create trigger assignments_cost
  before insert or update of starts_at, ends_at, resource_id, booking_kind
  on public.assignments
  for each row execute procedure public.compute_assignment_cost();

revoke execute on function public.compute_assignment_cost() from anon, authenticated, public;

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.resources enable row level security;
alter table public.assignments enable row level security;

-- --- resources: owner sees tenant; PM sees tenant; crew read their own ----
drop policy if exists resources_read on public.resources;
create policy resources_read on public.resources
  for select using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm'))
    or user_id = auth.uid()  -- a crew member can see their own resource row
  );

drop policy if exists resources_write on public.resources;
create policy resources_write on public.resources
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(tenant_id)
        and public.current_user_role() in ('owner','pm'))
  ) with check (tenant_id = public.current_user_tenant_id());

-- --- assignments: owner/PM manage; crew read their OWN bookings -----------
drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments
  for select using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and (
        public.current_user_role() = 'owner'
        or exists (select 1 from public.projects pr
                   where pr.id = project_id and pr.pm_id = auth.uid())
      )
    )
    or exists (  -- crew: see assignments for the resource that is me
      select 1 from public.resources r
      where r.id = resource_id and r.user_id = auth.uid()
    )
  );

drop policy if exists assignments_write on public.assignments;
create policy assignments_write on public.assignments
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() = 'owner'
        or exists (select 1 from public.projects pr
                   where pr.id = project_id and pr.pm_id = auth.uid())
      )
    )
  ) with check (tenant_id = public.current_user_tenant_id());

-- NOTE (follow-up, Phase 1d): crew who log in but are not tenant_members will
-- also need read access to the project name/address/stage for the jobs they
-- are assigned to. That is a parallel set of self-scoped read policies on
-- projects/project_stages and is intentionally NOT in this migration — it is
-- called out in the spec so the mobile data surface is designed deliberately
-- rather than opened by a broad policy here.
