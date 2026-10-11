-- =========================================================================
-- Builders Ready — Migration 32: Quote Templates v2 (price engine, slice 1)
-- =========================================================================
-- The "estimating brain": a platform-maintained price library + labour rates
-- + quote templates, so a builder picks a template, answers a few questions,
-- and gets a FULLY COSTED draft quote out of the box — populated with
-- suggested, data-grounded prices they can edit, then add their margin on top.
--
-- This slice ships ONE trade end-to-end: painting & decorating. The schema is
-- deliberately generic (assemblies/overrides land in later slices) but the
-- per-template computation lives in @br/shared (keyed by engine_key), so we
-- don't need a formula interpreter in the DB yet.
--
-- These three tables are PLATFORM-GLOBAL (no tenant_id): one catalogue shared
-- by every builder. Any authenticated user may READ the active catalogue;
-- only the platform admin / service role may WRITE it. Per-tenant price
-- overrides ("their own merchant rate") are a later slice and are additive.
--
-- Money is integer pence, matching estimates. Prices are ex-VAT, national
-- average. Every priced row carries a `source` + `priced_on` so the app can
-- honestly show "priced as of <date>" and a refresh story later.
-- =========================================================================

-- -------------------------------------------------------------------------
-- material_items — the priced catalogue
-- -------------------------------------------------------------------------
create table if not exists public.material_items (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique,         -- stable key used by the generator
  name                   text not null,
  category               text not null default 'general', -- 'paint' | 'sundries' | ...
  trade_category         text,                         -- matches TRADE_CATEGORIES (filter/scope)
  unit                   text not null default 'each', -- 'litre' | 'm2' | 'each' | 'job' | ...
  base_unit_cost_pence   bigint not null default 0 check (base_unit_cost_pence >= 0),
  -- Physical coverage (free public fact from the maker's TDS), used to turn a
  -- measured area into a quantity. NULL for non-paint items.
  coverage_m2_per_litre  numeric(6,2),
  source                 text,                         -- where the price/figure came from
  priced_on              date not null default current_date,
  active                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists material_items_touch on public.material_items;
create trigger material_items_touch
  before update on public.material_items
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- labour_rates — platform default day/hour rates by trade
-- The builder's OWN rate overrides this (later slice); seeded value is a
-- national-average planning default, clearly editable in the quote.
-- -------------------------------------------------------------------------
create table if not exists public.labour_rates (
  id              uuid primary key default gen_random_uuid(),
  trade           text not null,                 -- 'decorator' | 'bricklayer' | ...
  unit            text not null default 'day',   -- 'day' | 'hour'
  base_rate_pence bigint not null default 0 check (base_rate_pence >= 0),
  source          text,
  priced_on       date not null default current_date,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (trade, unit)
);

drop trigger if exists labour_rates_touch on public.labour_rates;
create trigger labour_rates_touch
  before update on public.labour_rates
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- quote_templates — a pickable template for a trade/project type
-- engine_key maps to the shared generator (@br/shared generateQuoteFromTemplate).
-- inputs_schema documents the questions the app asks (the painter screen is
-- bespoke for now; the schema powers the generic renderer in a later slice).
-- -------------------------------------------------------------------------
create table if not exists public.quote_templates (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid references public.tenants(id) on delete cascade, -- null = platform
  key            text not null unique,
  name           text not null,
  summary        text,
  trade_category text,                 -- matches TRADE_CATEGORIES
  project_type   text,                 -- links to PROJECT_TEMPLATES (timeline)
  engine_key     text not null,        -- which shared generator computes the lines
  inputs_schema  jsonb not null default '[]'::jsonb,
  version        integer not null default 1,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists quote_templates_touch on public.quote_templates;
create trigger quote_templates_touch
  before update on public.quote_templates
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- RLS — platform catalogue: anyone signed in may READ the active rows;
-- only the platform admin (service role bypasses RLS entirely) may WRITE.
-- -------------------------------------------------------------------------
alter table public.material_items  enable row level security;
alter table public.labour_rates    enable row level security;
alter table public.quote_templates enable row level security;

drop policy if exists material_items_read on public.material_items;
create policy material_items_read on public.material_items
  for select using (active or public.is_platform_admin());

drop policy if exists material_items_write on public.material_items;
create policy material_items_write on public.material_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists labour_rates_read on public.labour_rates;
create policy labour_rates_read on public.labour_rates
  for select using (active or public.is_platform_admin());

drop policy if exists labour_rates_write on public.labour_rates;
create policy labour_rates_write on public.labour_rates
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- quote_templates: active platform templates readable by all; a tenant's own
-- (future) saved templates readable by that tenant's owner/PM.
drop policy if exists quote_templates_read on public.quote_templates;
create policy quote_templates_read on public.quote_templates
  for select using (
    public.is_platform_admin()
    or (active and tenant_id is null)
    or (tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm'))
  );

drop policy if exists quote_templates_write on public.quote_templates;
create policy quote_templates_write on public.quote_templates
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(tenant_id)
        and public.current_user_role() in ('owner','pm'))
  ) with check (
    public.is_platform_admin()
    or tenant_id = public.current_user_tenant_id()
  );

-- -------------------------------------------------------------------------
-- SEED — Painting & decorating (data-grounded, ex-VAT, national average)
-- -------------------------------------------------------------------------
-- Material prices: current UK trade-retailer pages (Dulux Trade range),
--   converted to per-litre ex-VAT.
-- Coverage: Dulux Trade technical data sheets quote "up to 17 m²/L"; we seed
--   a CONSERVATIVE practical rate (below the headline) so the quote never
--   under-orders paint — protecting the builder, not flattering the maker.
-- =========================================================================
insert into public.material_items
  (code, name, category, trade_category, unit, base_unit_cost_pence,
   coverage_m2_per_litre, source, priced_on)
values
  ('PAINT-EMULSION-TRADE',
   'Trade matt emulsion (walls & ceilings)', 'paint', 'Painting & decorating',
   'litre', 880, 12.00,
   'Dulux Trade Vinyl Matt 5L (white), UK trade retailers, ex-VAT; coverage conservative vs TDS "up to 17 m²/L"',
   '2026-10-11'),
  ('PAINT-PRIMER-TRADE',
   'Primer / undercoat', 'paint', 'Painting & decorating',
   'litre', 880, 11.00,
   'Dulux Trade Undercoat, UK trade retailers, ex-VAT; coverage conservative vs TDS "up to 17 m²/L"',
   '2026-10-11'),
  ('PAINT-SATINWOOD-TRADE',
   'Satinwood / gloss (woodwork)', 'paint', 'Painting & decorating',
   'litre', 1600, 12.00,
   'Dulux Trade Satinwood, UK trade retailers, ex-VAT; coverage conservative vs TDS "up to 17 m²/L"',
   '2026-10-11'),
  ('DECOR-SUNDRIES',
   'Consumables (tape, filler, caulk, dust sheets, sleeves)', 'sundries',
   'Painting & decorating',
   'm2', 80, null,
   'Trade consumables allowance per m² of area prepared/painted; editable',
   '2026-10-11')
on conflict (code) do update set
  name                  = excluded.name,
  category              = excluded.category,
  trade_category        = excluded.trade_category,
  unit                  = excluded.unit,
  base_unit_cost_pence  = excluded.base_unit_cost_pence,
  coverage_m2_per_litre = excluded.coverage_m2_per_litre,
  source                = excluded.source,
  priced_on             = excluded.priced_on,
  active                = true;

insert into public.labour_rates (trade, unit, base_rate_pence, source, priced_on)
values
  ('decorator', 'day', 24000,
   'UK painter/decorator day rate, national planning average (Checkatrade ~£325 established; national range £180–£320). Set your own.',
   '2026-10-11')
on conflict (trade, unit) do update set
  base_rate_pence = excluded.base_rate_pence,
  source          = excluded.source,
  priced_on       = excluded.priced_on,
  active          = true;

insert into public.quote_templates
  (tenant_id, key, name, summary, trade_category, project_type, engine_key,
   inputs_schema, version, active)
values
  (null, 'painting_decorating', 'Painting & decorating',
   'Walls, ceilings and woodwork — answer a few questions for a costed draft.',
   'Painting & decorating', 'painting', 'painting_decorating',
   '[
     {"key":"wall_area_m2","label":"Wall area","unit":"m²","type":"number","default":40},
     {"key":"paint_ceiling","label":"Paint the ceiling(s)?","type":"bool","default":true},
     {"key":"ceiling_area_m2","label":"Ceiling area","unit":"m²","type":"number","default":14,"showIf":"paint_ceiling"},
     {"key":"coats","label":"Coats","type":"select","options":[1,2,3],"default":2},
     {"key":"surface","label":"Surface condition","type":"select","options":["good","patch","bare"],"default":"patch"},
     {"key":"woodwork","label":"Woodwork (gloss/satin)","type":"select","options":["none","some","lots"],"default":"some"},
     {"key":"margin_percent","label":"Your margin","unit":"%","type":"number","default":20}
   ]'::jsonb,
   1, true)
on conflict (key) do update set
  name           = excluded.name,
  summary        = excluded.summary,
  trade_category = excluded.trade_category,
  project_type   = excluded.project_type,
  engine_key     = excluded.engine_key,
  inputs_schema  = excluded.inputs_schema,
  version        = public.quote_templates.version + 1,
  active         = true;
