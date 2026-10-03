-- =========================================================================
-- Builders Ready — Migration 18: contracts & staged payment schedules
-- =========================================================================
-- A won quote becomes a contract: contract sum, terms, an optional retention
-- %, and a payment schedule of milestones (deposit, stage payments, retention).
-- The client SIGNS the contract in-app (like a variation) and can always see
-- the schedule — so unlike costs, contracts + milestones are CLIENT-VISIBLE.
--
-- Each milestone amount is either a fixed pence value OR a % of the contract
-- sum. A milestone can be raised as an invoice (reusing the invoices feature);
-- the linked invoice carries the paid state. Money is integer pence.
-- =========================================================================

do $$ begin
  create type public.contract_status as enum ('draft','sent','signed');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- contracts — one per project
-- -------------------------------------------------------------------------
create table if not exists public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  created_by          uuid not null references public.profiles(id) on delete restrict,
  contract_sum_pence  bigint not null check (contract_sum_pence > 0),
  terms               text,
  retention_percent   numeric(5,2) not null default 0
                        check (retention_percent >= 0 and retention_percent <= 100),
  status              public.contract_status not null default 'draft',
  sent_at             timestamptz,
  client_signature    text,
  signed_at           timestamptz,
  signed_by           uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (project_id)
);

create index if not exists contracts_project_idx
  on public.contracts(tenant_id, project_id);

drop trigger if exists contracts_touch on public.contracts;
create trigger contracts_touch
  before update on public.contracts
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- payment_milestones — the schedule
-- -------------------------------------------------------------------------
create table if not exists public.payment_milestones (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  contract_id   uuid not null references public.contracts(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  position      smallint not null default 0,
  name          text not null,
  -- Exactly one of percent / amount_pence carries the value.
  percent       numeric(6,3) check (percent is null or (percent >= 0 and percent <= 100)),
  amount_pence  bigint check (amount_pence is null or amount_pence > 0),
  is_retention  boolean not null default false,
  invoice_id    uuid references public.invoices(id) on delete set null,
  created_at    timestamptz not null default now(),
  check (percent is not null or amount_pence is not null)
);

create index if not exists payment_milestones_contract_idx
  on public.payment_milestones(contract_id, position);
create index if not exists payment_milestones_project_idx
  on public.payment_milestones(tenant_id, project_id);

-- -------------------------------------------------------------------------
-- tenant-id integrity guards
-- -------------------------------------------------------------------------
create or replace function public.assert_contract_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare parent_tenant uuid;
begin
  select tenant_id into parent_tenant from public.projects where id = new.project_id;
  if parent_tenant is null then
    raise exception 'assert_contract_tenant: parent project not found';
  end if;
  if new.tenant_id is null then new.tenant_id := parent_tenant;
  elsif new.tenant_id <> parent_tenant then
    raise exception 'tenant_id mismatch on contracts' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create or replace function public.assert_milestone_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare parent_tenant uuid;
begin
  select tenant_id into parent_tenant from public.projects where id = new.project_id;
  if parent_tenant is null then
    raise exception 'assert_milestone_tenant: parent project not found';
  end if;
  if new.tenant_id is null then new.tenant_id := parent_tenant;
  elsif new.tenant_id <> parent_tenant then
    raise exception 'tenant_id mismatch on payment_milestones' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists contracts_tenant_match on public.contracts;
create trigger contracts_tenant_match before insert or update on public.contracts
  for each row execute procedure public.assert_contract_tenant();

drop trigger if exists milestones_tenant_match on public.payment_milestones;
create trigger milestones_tenant_match before insert or update on public.payment_milestones
  for each row execute procedure public.assert_milestone_tenant();

revoke execute on function public.assert_contract_tenant() from anon, authenticated, public;
revoke execute on function public.assert_milestone_tenant() from anon, authenticated, public;

-- -------------------------------------------------------------------------
-- RLS — client-visible (they sign + watch the schedule).
-- -------------------------------------------------------------------------
alter table public.contracts          enable row level security;
alter table public.payment_milestones enable row level security;

-- contracts: anyone with project access can read.
drop policy if exists contracts_read on public.contracts;
create policy contracts_read on public.contracts
  for select using (public.has_project_access(project_id));

-- owner / PM manage.
drop policy if exists contracts_pm_write on public.contracts;
create policy contracts_pm_write on public.contracts
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() = 'owner'
        or exists (
          select 1 from public.projects pr
          where pr.id = project_id and pr.pm_id = auth.uid()
        )
      )
    )
  ) with check (tenant_id = public.current_user_tenant_id());

-- client signs (sets status/signature/signed_*).
drop policy if exists contracts_client_sign on public.contracts;
create policy contracts_client_sign on public.contracts
  for update using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (signed_by = auth.uid());

-- milestones: readable with project access.
drop policy if exists milestones_read on public.payment_milestones;
create policy milestones_read on public.payment_milestones
  for select using (public.has_project_access(project_id));

drop policy if exists milestones_pm_write on public.payment_milestones;
create policy milestones_pm_write on public.payment_milestones
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() = 'owner'
        or exists (
          select 1 from public.projects pr
          where pr.id = project_id and pr.pm_id = auth.uid()
        )
      )
    )
  ) with check (tenant_id = public.current_user_tenant_id());
