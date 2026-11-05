-- The marketplace, builder->sub direction (builds on the existing
-- tenants + trades_public homeowner marketplace, does not replace it).
--
-- For-hire fields on the tenant = a paid tradesman's "For Hire Profile".
-- Default off ("available for work" is opt-in). Synced onto trades_public so
-- the directory can read public card fields without widening tenants RLS.

alter table public.tenants
  add column if not exists discoverable boolean not null default false,
  add column if not exists day_rate_pence bigint,
  add column if not exists day_rate_unit text not null default 'day' check (day_rate_unit in ('day','hour')),
  add column if not exists for_hire_trades text[] not null default '{}',
  add column if not exists service_area text;

alter table public.trades_public
  add column if not exists discoverable boolean not null default false,
  add column if not exists day_rate_pence bigint,
  add column if not exists day_rate_unit text,
  add column if not exists for_hire_trades text[] not null default '{}',
  add column if not exists service_area text;

create or replace function public.sync_trades_public()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.trades_public where id = old.id;
    return old;
  end if;
  insert into public.trades_public (id, name, logo_url, owner_user_id, business_phone, business_email,
    discoverable, day_rate_pence, day_rate_unit, for_hire_trades, service_area)
  values (new.id, new.name, new.logo_url, new.owner_user_id, new.business_phone, new.business_email,
    new.discoverable, new.day_rate_pence, new.day_rate_unit, new.for_hire_trades, new.service_area)
  on conflict (id) do update set
    name = excluded.name,
    logo_url = excluded.logo_url,
    owner_user_id = excluded.owner_user_id,
    business_phone = excluded.business_phone,
    business_email = excluded.business_email,
    discoverable = excluded.discoverable,
    day_rate_pence = excluded.day_rate_pence,
    day_rate_unit = excluded.day_rate_unit,
    for_hire_trades = excluded.for_hire_trades,
    service_area = excluded.service_area;
  return new;
end $$;

update public.trades_public tp set
  discoverable = t.discoverable,
  day_rate_pence = t.day_rate_pence,
  day_rate_unit = t.day_rate_unit,
  for_hire_trades = t.for_hire_trades,
  service_area = t.service_area
from public.tenants t where t.id = tp.id;

-- Directory: discoverable tradespeople, filtered by trade + area, with a
-- rating summary from marketplace_reviews. Public card fields only, excludes
-- the caller's own tenant.
create or replace function public.search_tradespeople(p_trade text default null, p_area text default null)
returns table(
  tenant_id uuid,
  name text,
  logo_url text,
  business_phone text,
  business_email text,
  day_rate_pence bigint,
  day_rate_unit text,
  trades text[],
  service_area text,
  rating numeric,
  review_count int
)
language sql stable security definer set search_path = public as $$
  select tp.id, tp.name, tp.logo_url, tp.business_phone, tp.business_email,
         tp.day_rate_pence, tp.day_rate_unit, tp.for_hire_trades, tp.service_area,
         rv.avg_rating, coalesce(rv.cnt, 0)
  from public.trades_public tp
  left join lateral (
    select round(avg(mr.rating)::numeric, 1) as avg_rating, count(*)::int as cnt
    from public.marketplace_reviews mr
    where mr.reviewee_id = tp.owner_user_id
  ) rv on true
  where tp.discoverable = true
    and tp.id is distinct from public.current_user_tenant_id()
    and (p_trade is null or p_trade = '' or p_trade = any(tp.for_hire_trades))
    and (p_area is null or p_area = '' or coalesce(tp.service_area,'') ilike '%' || p_area || '%')
  order by coalesce(rv.cnt, 0) desc, tp.name;
$$;

grant execute on function public.search_tradespeople(text, text) to authenticated;
