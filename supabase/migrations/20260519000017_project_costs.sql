-- =========================================================================
-- Builders Ready — Migration 17: project costs & margin tracking
-- =========================================================================
-- Actual money going OUT on a job, logged by owners/PMs. Combined with the
-- project's contract value (quote + signed variations) this gives live margin.
--
-- SENSITIVE: costs and margin are OWNER/PM ONLY — clients must never see them.
-- Unlike other project child tables, the RLS here deliberately does NOT use
-- has_project_access() (which grants clients), only the owner/PM gate.
--
-- Money is integer pence. Receipt photos live in a private, owner/PM-only
-- bucket keyed cost-receipts/<tenant_id>/<project_id>/<file>.
-- =========================================================================

do $$ begin
  create type public.cost_category as enum (
    'materials','labour','plant_hire','subcontractor','other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.project_costs (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  project_id           uuid not null references public.projects(id) on delete cascade,
  created_by           uuid not null references public.profiles(id) on delete restrict,
  category             public.cost_category not null default 'materials',
  description          text not null,
  amount_pence         bigint not null check (amount_pence > 0),
  supplier             text,
  incurred_on          date not null default current_date,
  receipt_storage_path text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists project_costs_project_idx
  on public.project_costs(tenant_id, project_id, incurred_on desc);
create index if not exists project_costs_category_idx
  on public.project_costs(tenant_id, project_id, category);

drop trigger if exists project_costs_touch on public.project_costs;
create trigger project_costs_touch
  before update on public.project_costs
  for each row execute procedure public.touch_updated_at();

-- tenant-id integrity guard (parent is a project)
create or replace function public.assert_project_cost_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent_tenant uuid;
begin
  select tenant_id into parent_tenant from public.projects where id = new.project_id;
  if parent_tenant is null then
    raise exception 'assert_project_cost_tenant: parent project not found';
  end if;
  if new.tenant_id is null then
    new.tenant_id := parent_tenant;
  elsif new.tenant_id <> parent_tenant then
    raise exception 'tenant_id mismatch on project_costs: row=% parent=%',
      new.tenant_id, parent_tenant using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists project_costs_tenant_match on public.project_costs;
create trigger project_costs_tenant_match
  before insert or update on public.project_costs
  for each row execute procedure public.assert_project_cost_tenant();

revoke execute on function public.assert_project_cost_tenant() from anon, authenticated;
revoke execute on function public.assert_project_cost_tenant() from public;

-- -------------------------------------------------------------------------
-- RLS — owner sees the whole tenant; PM sees costs on the projects they run.
-- Clients get NO policy at all, so they can never read or write costs.
-- -------------------------------------------------------------------------
alter table public.project_costs enable row level security;

drop policy if exists project_costs_read on public.project_costs;
create policy project_costs_read on public.project_costs
  for select using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and (
        public.current_user_role() = 'owner'
        or exists (
          select 1 from public.projects pr
          where pr.id = project_id and pr.pm_id = auth.uid()
        )
      )
    )
  );

drop policy if exists project_costs_write on public.project_costs;
create policy project_costs_write on public.project_costs
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

-- -------------------------------------------------------------------------
-- cost-receipts bucket — private, owner/PM only (NOT has_project_access).
-- Object key: cost-receipts/<tenant_id>/<project_id>/<file>
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cost-receipts', 'cost-receipts', false, 20971520, -- 20 MiB
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

drop policy if exists "cost_receipts_read" on storage.objects;
create policy "cost_receipts_read" on storage.objects for select using (
  bucket_id = 'cost-receipts'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (
    public.is_platform_admin()
    or public.current_user_role() = 'owner'
    or exists (
      select 1 from public.projects pr
      where pr.id = (storage.foldername(name))[2]::uuid
        and pr.pm_id = auth.uid()
    )
  )
);

drop policy if exists "cost_receipts_write" on storage.objects;
create policy "cost_receipts_write" on storage.objects for insert with check (
  bucket_id = 'cost-receipts'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (
    public.is_platform_admin()
    or public.current_user_role() = 'owner'
    or exists (
      select 1 from public.projects pr
      where pr.id = (storage.foldername(name))[2]::uuid
        and pr.pm_id = auth.uid()
    )
  )
);

drop policy if exists "cost_receipts_delete" on storage.objects;
create policy "cost_receipts_delete" on storage.objects for delete using (
  bucket_id = 'cost-receipts'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (
    public.is_platform_admin()
    or public.current_user_role() = 'owner'
    or exists (
      select 1 from public.projects pr
      where pr.id = (storage.foldername(name))[2]::uuid
        and pr.pm_id = auth.uid()
    )
  )
);
