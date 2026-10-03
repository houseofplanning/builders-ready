-- =========================================================================
-- Marketplace — Phase 6: PII-free public feeds so a signed-in CUSTOMER (who
-- has no tenant) can browse other people's open jobs without seeing who posted
-- them, and see which trade quoted on their own jobs.
--
-- RLS is row-level, not column-level, so we can't hide customer_id on the base
-- table. Instead we keep synced projection TABLES (each with its own RLS)
-- carrying only non-identifying columns. Trigger-maintained; lint-clean.
-- =========================================================================

-- --- open jobs feed (no customer_id, no address_line1; OPEN jobs only) ------
create table public.open_jobs_feed (
  id               uuid primary key references public.job_requests(id) on delete cascade,
  trade_category   text not null,
  title            text not null,
  description      text,
  city             text,
  postcode         text not null,
  budget_min_pence bigint,
  budget_max_pence bigint,
  budget_note      text,
  created_at       timestamptz not null
);
create index open_jobs_feed_browse_idx on public.open_jobs_feed (trade_category, created_at desc);

alter table public.open_jobs_feed enable row level security;
create policy open_jobs_feed_read on public.open_jobs_feed
  for select using (auth.uid() is not null);

create or replace function public.sync_open_jobs_feed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.open_jobs_feed where id = old.id;
    return old;
  end if;
  if (new.status = 'open') then
    insert into public.open_jobs_feed
      (id, trade_category, title, description, city, postcode,
       budget_min_pence, budget_max_pence, budget_note, created_at)
    values
      (new.id, new.trade_category, new.title, new.description, new.city, new.postcode,
       new.budget_min_pence, new.budget_max_pence, new.budget_note, new.created_at)
    on conflict (id) do update set
      trade_category = excluded.trade_category,
      title = excluded.title,
      description = excluded.description,
      city = excluded.city,
      postcode = excluded.postcode,
      budget_min_pence = excluded.budget_min_pence,
      budget_max_pence = excluded.budget_max_pence,
      budget_note = excluded.budget_note;
  else
    delete from public.open_jobs_feed where id = new.id;
  end if;
  return new;
end $$;
revoke execute on function public.sync_open_jobs_feed() from anon, authenticated;

create trigger job_requests_feed_sync
  after insert or update or delete on public.job_requests
  for each row execute function public.sync_open_jobs_feed();

insert into public.open_jobs_feed
  (id, trade_category, title, description, city, postcode,
   budget_min_pence, budget_max_pence, budget_note, created_at)
select id, trade_category, title, description, city, postcode,
       budget_min_pence, budget_max_pence, budget_note, created_at
from public.job_requests where status = 'open'
on conflict (id) do nothing;

-- --- public trade identity (name/logo/owner only) --------------------------
create table public.trades_public (
  id            uuid primary key references public.tenants(id) on delete cascade,
  name          text not null,
  logo_url      text,
  owner_user_id uuid
);

alter table public.trades_public enable row level security;
create policy trades_public_read on public.trades_public
  for select using (auth.uid() is not null);

create or replace function public.sync_trades_public()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.trades_public where id = old.id;
    return old;
  end if;
  insert into public.trades_public (id, name, logo_url, owner_user_id)
  values (new.id, new.name, new.logo_url, new.owner_user_id)
  on conflict (id) do update set
    name = excluded.name,
    logo_url = excluded.logo_url,
    owner_user_id = excluded.owner_user_id;
  return new;
end $$;
revoke execute on function public.sync_trades_public() from anon, authenticated;

create trigger tenants_public_sync
  after insert or update or delete on public.tenants
  for each row execute function public.sync_trades_public();

insert into public.trades_public (id, name, logo_url, owner_user_id)
select id, name, logo_url, owner_user_id from public.tenants
on conflict (id) do nothing;
