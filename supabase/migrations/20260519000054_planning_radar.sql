-- =========================================================================
-- Planning Radar — Phase 1: data layer
--
-- UK-wide planning-application leads for builders. Source: PlanIt national API
-- (ingested server-side by the `planning-ingest` Edge Function). We store only
-- the public, minimal fields (address / description / type / status / dates /
-- location / portal link) — NO applicant or agent personal data.
--
-- Trades (tenant members) can browse listings; marketplace customers cannot.
-- A builder's working state (pipeline stage, saved searches, letters) is
-- per-tenant private.
-- =========================================================================

create type public.planning_status as enum
  ('approved','pending','refused','withdrawn','other');

-- -------------------------------------------------------------------------
-- planning_listings — one row per planning application (PlanIt uid = id).
-- Written only by the ingest function (service role). Read by trades.
-- -------------------------------------------------------------------------
create table public.planning_listings (
  id                 text primary key,            -- PlanIt uid (stable, dedupes)
  authority          text,
  address            text not null,
  postcode           text,
  latitude           double precision,
  longitude          double precision,
  description        text,
  application_type   text,                         -- raw PlanIt app_type
  work_category      text,                         -- normalised (extension/loft/...)
  status             public.planning_status not null default 'other',
  status_raw         text,                         -- raw PlanIt app_state
  validated_date     date,                         -- PlanIt start_date
  decided_date       date,
  portal_url         text,                         -- direct council record link
  source_updated_at  timestamptz,
  synced_at          timestamptz not null default now()
);
create index planning_listings_geo_idx      on public.planning_listings (latitude, longitude);
create index planning_listings_postcode_idx on public.planning_listings (postcode);
create index planning_listings_browse_idx   on public.planning_listings (status, work_category, validated_date desc);

-- -------------------------------------------------------------------------
-- planning_catchments — the areas the ingest job pulls for. Seeded from
-- builders' chosen areas / saved searches (and manual seeds). Service-role
-- only (no client policies).
-- -------------------------------------------------------------------------
create table public.planning_catchments (
  id           uuid primary key default gen_random_uuid(),
  center_lat   double precision not null,
  center_lon   double precision not null,
  radius_km    numeric not null default 16,       -- ~10 miles
  label        text,
  source       text not null default 'tenant',    -- tenant | saved_search | manual
  active       boolean not null default true,
  last_run_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (center_lat, center_lon, radius_km)
);

-- -------------------------------------------------------------------------
-- planning_listing_actions — per-tenant private pipeline state.
-- -------------------------------------------------------------------------
create table public.planning_listing_actions (
  id         uuid primary key default gen_random_uuid(),
  listing_id text not null references public.planning_listings(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  stage      text not null default 'saved'
             check (stage in ('saved','approached','replied','won','not_interested')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, tenant_id)
);
create index planning_actions_tenant_idx on public.planning_listing_actions (tenant_id, stage);
create trigger planning_actions_touch before update on public.planning_listing_actions
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- planning_saved_searches — saved area + filters, drives alerts (PR-2).
-- -------------------------------------------------------------------------
create table public.planning_saved_searches (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  created_by      uuid not null references public.profiles(id),
  name            text,
  center_lat      double precision,
  center_lon      double precision,
  radius_miles    numeric,
  work_categories text[] not null default '{}',
  statuses        public.planning_status[] not null default '{}',
  alerts_enabled  boolean not null default true,
  last_alerted_at timestamptz,
  created_at      timestamptz not null default now()
);
create index planning_saved_searches_tenant_idx on public.planning_saved_searches (tenant_id);

-- -------------------------------------------------------------------------
-- planning_letters — editable occupier-letter draft + rendered PDF (PR-6).
-- -------------------------------------------------------------------------
create table public.planning_letters (
  id         uuid primary key default gen_random_uuid(),
  listing_id text not null references public.planning_listings(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  body       text not null,
  pdf_path   text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index planning_letters_tenant_idx on public.planning_letters (tenant_id);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.planning_listings         enable row level security;
alter table public.planning_catchments        enable row level security;
alter table public.planning_listing_actions   enable row level security;
alter table public.planning_saved_searches     enable row level security;
alter table public.planning_letters            enable row level security;

-- listings: any active trade (tenant member) may read; nobody writes via the
-- client (ingest uses the service role, which bypasses RLS). Marketplace
-- customers have no tenant membership, so they see nothing.
create policy planning_listings_read_trades on public.planning_listings
  for select using (public.current_user_tenant_id() is not null);

-- catchments: no client policies => service role only.

-- per-tenant private tables: full CRUD scoped to the caller's tenant.
create policy planning_actions_rw on public.planning_listing_actions
  for all using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id() and created_by = auth.uid());

create policy planning_saved_rw on public.planning_saved_searches
  for all using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id() and created_by = auth.uid());

create policy planning_letters_rw on public.planning_letters
  for all using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id() and created_by = auth.uid());

-- =========================================================================
-- search_planning_listings — radius search with haversine distance.
-- security invoker (default) so planning_listings RLS still applies: only
-- trades get rows back.
-- =========================================================================
create or replace function public.search_planning_listings(
  p_lat             double precision,
  p_lon             double precision,
  p_radius_km       numeric,
  p_work_categories text[]                 default null,
  p_statuses        public.planning_status[] default null,
  p_limit           int                    default 100,
  p_offset          int                    default 0
)
returns table (
  id               text,
  authority        text,
  address          text,
  postcode         text,
  latitude         double precision,
  longitude        double precision,
  description      text,
  application_type text,
  work_category    text,
  status           public.planning_status,
  status_raw       text,
  validated_date   date,
  decided_date     date,
  portal_url       text,
  distance_km      double precision
)
language sql stable
set search_path = public
as $$
  select * from (
    select
      l.id, l.authority, l.address, l.postcode, l.latitude, l.longitude,
      l.description, l.application_type, l.work_category, l.status,
      l.status_raw, l.validated_date, l.decided_date, l.portal_url,
      (6371 * acos(greatest(-1, least(1,
        cos(radians(p_lat)) * cos(radians(l.latitude)) *
          cos(radians(l.longitude) - radians(p_lon)) +
        sin(radians(p_lat)) * sin(radians(l.latitude))
      )))) as distance_km
    from public.planning_listings l
    where l.latitude is not null and l.longitude is not null
      and (p_work_categories is null or l.work_category = any(p_work_categories))
      and (p_statuses is null or l.status = any(p_statuses))
  ) q
  where q.distance_km <= p_radius_km
  order by q.distance_km asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.search_planning_listings(
  double precision, double precision, numeric, text[], public.planning_status[], int, int
) to authenticated;

-- =========================================================================
-- register_planning_catchment — a builder searching their area registers it
-- as a catchment so the nightly ingest starts covering it. Registers a
-- generous radius; the app filters the view distance via search_planning_listings.
-- =========================================================================
create or replace function public.register_planning_catchment(
  p_lat double precision, p_lon double precision
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_tenant_id() is null then return; end if;
  insert into public.planning_catchments (center_lat, center_lon, radius_km, source, active)
  values (round(p_lat::numeric, 3), round(p_lon::numeric, 3), 24, 'tenant', true)
  on conflict (center_lat, center_lon, radius_km)
    do update set active = true;
end $$;

grant execute on function public.register_planning_catchment(double precision, double precision) to authenticated;
