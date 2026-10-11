-- =========================================================================
-- Builders Ready — Migration 43: per-tenant price overrides (rate book)
-- =========================================================================
-- A builder's own prices over the platform catalogue. Keyed by material code
-- / (trade, unit) so they map onto material_items + labour_rates. Merged into
-- the price book at generation time (@br/shared mergePriceBook), so templates
-- quote with the builder's numbers everywhere. Owner/PM read-write their own.
-- =========================================================================
create table if not exists public.tenant_material_prices (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  material_code  text not null references public.material_items(code) on delete cascade,
  unit_cost_pence bigint not null check (unit_cost_pence >= 0),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, material_code)
);

create table if not exists public.tenant_labour_rates (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  trade          text not null,
  unit           text not null default 'day',
  rate_pence     bigint not null check (rate_pence >= 0),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, trade, unit)
);

alter table public.tenant_material_prices enable row level security;
alter table public.tenant_labour_rates    enable row level security;

drop policy if exists tmp_rw on public.tenant_material_prices;
create policy tmp_rw on public.tenant_material_prices
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm'))
  ) with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_active(tenant_id)
    and public.current_user_role() in ('owner','pm')
  );

drop policy if exists tlr_rw on public.tenant_labour_rates;
create policy tlr_rw on public.tenant_labour_rates
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm'))
  ) with check (
    tenant_id = public.current_user_tenant_id()
    and public.is_tenant_active(tenant_id)
    and public.current_user_role() in ('owner','pm')
  );
