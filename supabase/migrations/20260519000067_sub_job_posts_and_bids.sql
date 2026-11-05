-- Builder-posted jobs for subcontractors (Door C). Kept separate from the
-- homeowner job_requests/bids so the homeowner flow is untouched. A tenant
-- posts a job, discoverable tradespeople bid, accepting a bid connects them.

create table if not exists public.sub_job_posts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  trade         text,
  title         text not null,
  description   text,
  area          text,
  postcode      text,
  start_date    date,
  duration_note text,
  budget_note   text,
  status        text not null default 'open' check (status in ('open','awarded','closed')),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.sub_job_bids (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.sub_job_posts(id) on delete cascade,
  bidder_tenant_id  uuid not null references public.tenants(id) on delete cascade,
  amount_pence      bigint,
  message           text,
  status            text not null default 'submitted' check (status in ('submitted','accepted','declined','withdrawn')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (post_id, bidder_tenant_id)
);

create index if not exists sub_job_posts_tenant_idx on public.sub_job_posts(tenant_id);
create index if not exists sub_job_posts_status_idx on public.sub_job_posts(status);
create index if not exists sub_job_bids_post_idx on public.sub_job_bids(post_id);
create index if not exists sub_job_bids_bidder_idx on public.sub_job_bids(bidder_tenant_id);

drop trigger if exists sub_job_posts_touch on public.sub_job_posts;
create trigger sub_job_posts_touch before update on public.sub_job_posts
  for each row execute function public.touch_updated_at();
drop trigger if exists sub_job_bids_touch on public.sub_job_bids;
create trigger sub_job_bids_touch before update on public.sub_job_bids
  for each row execute function public.touch_updated_at();

alter table public.sub_job_posts enable row level security;
alter table public.sub_job_bids enable row level security;

drop policy if exists sub_job_posts_read on public.sub_job_posts;
create policy sub_job_posts_read on public.sub_job_posts
  for select using (
    public.is_platform_admin()
    or tenant_id = public.current_user_tenant_id()
    or (status = 'open' and public.current_user_tenant_id() is not null)
  );
drop policy if exists sub_job_posts_write on public.sub_job_posts;
create policy sub_job_posts_write on public.sub_job_posts
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm'))
  ) with check (
    tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm')
  );

drop policy if exists sub_job_bids_read on public.sub_job_bids;
create policy sub_job_bids_read on public.sub_job_bids
  for select using (
    public.is_platform_admin()
    or bidder_tenant_id = public.current_user_tenant_id()
    or exists (select 1 from public.sub_job_posts p where p.id = post_id and p.tenant_id = public.current_user_tenant_id())
  );
drop policy if exists sub_job_bids_write on public.sub_job_bids;
create policy sub_job_bids_write on public.sub_job_bids
  for all using (
    public.is_platform_admin()
    or (bidder_tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm'))
  ) with check (
    bidder_tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm')
  );

create or replace function public.accept_sub_bid(p_bid_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_post_id uuid;
  v_poster_tenant uuid;
  v_project uuid;
  v_bidder uuid;
  v_name text;
  v_rate bigint;
  v_unit text;
  v_trade text;
begin
  select b.post_id, b.bidder_tenant_id, p.tenant_id, p.project_id, p.trade
    into v_post_id, v_bidder, v_poster_tenant, v_project, v_trade
  from public.sub_job_bids b
  join public.sub_job_posts p on p.id = b.post_id
  where b.id = p_bid_id;

  if v_post_id is null then
    raise exception 'Bid not found';
  end if;
  if not (public.is_platform_admin()
          or (v_poster_tenant = public.current_user_tenant_id()
              and public.current_user_role() in ('owner','pm'))) then
    raise exception 'Only the builder who posted the job can accept a bid';
  end if;

  update public.sub_job_bids set status = 'accepted', updated_at = now() where id = p_bid_id;
  update public.sub_job_bids set status = 'declined', updated_at = now()
    where post_id = v_post_id and id <> p_bid_id and status = 'submitted';
  update public.sub_job_posts set status = 'awarded', updated_at = now() where id = v_post_id;

  select name, day_rate_pence, day_rate_unit into v_name, v_rate, v_unit
    from public.tenants where id = v_bidder;

  if not exists (
    select 1 from public.resources
    where tenant_id = v_poster_tenant and marketplace_tenant_id = v_bidder
  ) then
    insert into public.resources (tenant_id, kind, display_name, trade, marketplace_tenant_id,
      connection_status, cost_rate_pence, cost_rate_unit)
    values (v_poster_tenant, 'subcontractor', coalesce(v_name,'Subcontractor'), v_trade, v_bidder,
      'connected', v_rate, case when v_unit = 'hour' then 'hour' else 'day' end);
  end if;
end $$;

grant execute on function public.accept_sub_bid(uuid) to authenticated;
