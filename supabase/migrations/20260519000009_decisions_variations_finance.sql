-- =========================================================================
-- Builders Ready — Migration 9/9: decisions, variations, invoices, finance
-- =========================================================================
-- The three v1 differentiator features from Deliverable 3 §10.
-- Tenant-scoped per the standard pattern; bank details for invoice display
-- come from the tenants table (no separate settings row).
-- =========================================================================

-- -------------------------------------------------------------------------
-- decisions + decision_options
-- -------------------------------------------------------------------------
create table if not exists public.decisions (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  raised_by           uuid not null references public.profiles(id) on delete restrict,
  title               text not null,
  description         text,
  deadline            date,
  status              public.decision_status not null default 'open',
  selected_option_id  uuid,
  decided_at          timestamptz,
  decided_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists decisions_project_idx
  on public.decisions(tenant_id, project_id, deadline);

drop trigger if exists decisions_touch on public.decisions;
create trigger decisions_touch
  before update on public.decisions
  for each row execute procedure public.touch_updated_at();

create table if not exists public.decision_options (
  id                  uuid primary key default gen_random_uuid(),
  decision_id         uuid not null references public.decisions(id) on delete cascade,
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  label               text not null,
  description         text,
  price_gbp_pence     bigint check (price_gbp_pence >= 0),
  photo_storage_path  text,
  position            smallint not null default 0
);

create index if not exists decision_options_decision_idx
  on public.decision_options(decision_id, position);

alter table public.decisions
  drop constraint if exists decisions_selected_option_fk,
  add constraint decisions_selected_option_fk
    foreign key (selected_option_id) references public.decision_options(id)
    on delete set null deferrable initially deferred;

alter table public.decisions       enable row level security;
alter table public.decision_options enable row level security;

drop policy if exists decisions_read on public.decisions;
create policy decisions_read on public.decisions
  for select using (public.has_project_access(project_id));

drop policy if exists decisions_pm_write on public.decisions;
create policy decisions_pm_write on public.decisions
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

-- Clients can accept/reject (set selected_option_id, status, decided_*).
drop policy if exists decisions_client_decide on public.decisions;
create policy decisions_client_decide on public.decisions
  for update using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (decided_by = auth.uid());

drop policy if exists decision_options_read on public.decision_options;
create policy decision_options_read on public.decision_options
  for select using (
    exists (
      select 1 from public.decisions d
      where d.id = decision_id and public.has_project_access(d.project_id)
    )
  );

drop policy if exists decision_options_write on public.decision_options;
create policy decision_options_write on public.decision_options
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and exists (
        select 1 from public.decisions d
        join public.projects pr on pr.id = d.project_id
        where d.id = decision_id
          and (pr.pm_id = auth.uid() or public.current_user_role() = 'owner')
      )
    )
  ) with check (tenant_id = public.current_user_tenant_id());

-- -------------------------------------------------------------------------
-- variations (change orders)
-- -------------------------------------------------------------------------
create table if not exists public.variations (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants(id) on delete cascade,
  project_id               uuid not null references public.projects(id) on delete cascade,
  proposed_by              uuid not null references public.profiles(id) on delete restrict,
  number                   text not null,
  title                    text not null,
  description              text,
  delta_amount_gbp_pence   bigint not null,
  delta_days               smallint not null default 0,
  status                   public.variation_status not null default 'proposed',
  decided_at               timestamptz,
  decided_by               uuid references public.profiles(id),
  client_signature         text,
  created_at               timestamptz not null default now(),
  unique (tenant_id, number)
);

create index if not exists variations_project_idx
  on public.variations(tenant_id, project_id, created_at desc);

alter table public.variations enable row level security;

drop policy if exists variations_read on public.variations;
create policy variations_read on public.variations
  for select using (public.has_project_access(project_id));

drop policy if exists variations_pm_write on public.variations;
create policy variations_pm_write on public.variations
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

drop policy if exists variations_client_decide on public.variations;
create policy variations_client_decide on public.variations
  for update using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (decided_by = auth.uid());

-- -------------------------------------------------------------------------
-- invoices
-- -------------------------------------------------------------------------
create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  created_by          uuid not null references public.profiles(id) on delete restrict,
  number              text not null,
  title               text not null,
  description         text,
  amount_gbp_pence    bigint not null check (amount_gbp_pence > 0),
  issued_at           date not null default current_date,
  due_at              date not null,
  status              public.invoice_status not null default 'sent',
  paid_at             timestamptz,
  paid_reference      text,
  paid_marked_by      uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, number)
);

create index if not exists invoices_project_idx
  on public.invoices(tenant_id, project_id, issued_at desc);
create index if not exists invoices_status_idx on public.invoices(tenant_id, status);

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch
  before update on public.invoices
  for each row execute procedure public.touch_updated_at();

alter table public.invoices enable row level security;

drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices
  for select using (public.has_project_access(project_id));

drop policy if exists invoices_pm_write on public.invoices;
create policy invoices_pm_write on public.invoices
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

drop policy if exists invoices_client_mark_paid on public.invoices;
create policy invoices_client_mark_paid on public.invoices
  for update using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (paid_marked_by = auth.uid());

-- -------------------------------------------------------------------------
-- project_finance — composite view; RLS inherited from underlying tables
-- -------------------------------------------------------------------------
create or replace view public.project_finance as
  select
    pr.id        as project_id,
    pr.tenant_id as tenant_id,
    coalesce(
      (select sum(v.delta_amount_gbp_pence) from public.variations v
        where v.project_id = pr.id and v.status = 'accepted'), 0
    ) as variations_pence,
    coalesce(
      (select sum(i.amount_gbp_pence) from public.invoices i
        where i.project_id = pr.id and i.status in ('sent','paid','overdue')), 0
    ) as invoiced_pence,
    coalesce(
      (select sum(i.amount_gbp_pence) from public.invoices i
        where i.project_id = pr.id and i.status = 'paid'), 0
    ) as paid_pence,
    coalesce(
      (select count(*) from public.decisions d
        where d.project_id = pr.id and d.status = 'open'), 0
    ) as open_decisions
  from public.projects pr;
