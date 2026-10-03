-- =========================================================================
-- Marketplace — Phase 1: job requests, bids, messaging, two-way reviews
-- Customers = auth users with NO tenant membership (current_user_tenant_id()
-- IS NULL). Trades = tenant members. These tables are cross-tenant by design:
-- any active trade can browse open job requests and bid on them.
-- =========================================================================

create type public.job_request_status as enum ('open','matched','closed','expired','cancelled');
create type public.bid_status        as enum ('submitted','shortlisted','accepted','declined','withdrawn');
create type public.review_direction  as enum ('customer_to_trade','trade_to_customer');

-- -------------------------------------------------------------------------
-- job_requests — posted by a customer, visible to trades
-- -------------------------------------------------------------------------
create table public.job_requests (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.profiles(id) on delete cascade,
  trade_category    text not null,
  title             text not null,
  description       text,
  address_line1     text,
  city              text,
  postcode          text not null,
  latitude          double precision,
  longitude         double precision,
  budget_min_pence  bigint check (budget_min_pence is null or budget_min_pence >= 0),
  budget_max_pence  bigint check (budget_max_pence is null or budget_max_pence >= 0),
  budget_note       text,
  photos            text[] not null default '{}',
  status            public.job_request_status not null default 'open',
  matched_project_id uuid references public.projects(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  expires_at        timestamptz,
  check (budget_max_pence is null or budget_min_pence is null or budget_max_pence >= budget_min_pence)
);
create index job_requests_browse_idx on public.job_requests (status, trade_category, created_at desc);
create index job_requests_customer_idx on public.job_requests (customer_id);
create index job_requests_postcode_idx on public.job_requests (postcode);
create trigger job_requests_touch before update on public.job_requests
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- bids — a trade's bid / quote on a job request
-- -------------------------------------------------------------------------
create table public.bids (
  id              uuid primary key default gen_random_uuid(),
  job_request_id  uuid not null references public.job_requests(id) on delete cascade,
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  created_by      uuid not null references public.profiles(id),
  amount_pence    bigint check (amount_pence is null or amount_pence > 0),
  message         text,
  estimate_id     uuid references public.estimates(id) on delete set null,
  status          public.bid_status not null default 'submitted',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (job_request_id, tenant_id)
);
create index bids_job_idx on public.bids (job_request_id);
create index bids_tenant_idx on public.bids (tenant_id);
create trigger bids_touch before update on public.bids
  for each row execute procedure public.touch_updated_at();

-- back-reference: which bid the customer accepted
alter table public.job_requests
  add column matched_bid_id uuid references public.bids(id) on delete set null;

-- -------------------------------------------------------------------------
-- marketplace_threads + marketplace_messages — one thread per (job, trade)
-- (named distinctly from the existing in-project `messages` table)
-- -------------------------------------------------------------------------
create table public.marketplace_threads (
  id              uuid primary key default gen_random_uuid(),
  job_request_id  uuid not null references public.job_requests(id) on delete cascade,
  customer_id     uuid not null references public.profiles(id) on delete cascade,
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz,
  unique (job_request_id, tenant_id)
);
create index marketplace_threads_customer_idx on public.marketplace_threads (customer_id);
create index marketplace_threads_tenant_idx on public.marketplace_threads (tenant_id);

create table public.marketplace_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.marketplace_threads(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id),
  body       text not null,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index marketplace_messages_thread_idx on public.marketplace_messages (thread_id, created_at);

-- -------------------------------------------------------------------------
-- marketplace_reviews — two-way, tied to a COMPLETED project (verified)
-- -------------------------------------------------------------------------
create table public.marketplace_reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  direction   public.review_direction not null,
  rating      smallint not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now(),
  unique (project_id, direction)
);
create index marketplace_reviews_tenant_idx on public.marketplace_reviews (tenant_id);
create index marketplace_reviews_reviewee_idx on public.marketplace_reviews (reviewee_id);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.job_requests         enable row level security;
alter table public.bids                  enable row level security;
alter table public.marketplace_threads   enable row level security;
alter table public.marketplace_messages  enable row level security;
alter table public.marketplace_reviews   enable row level security;

-- job_requests: customer owns; any active trade can see OPEN jobs or jobs they bid on
create policy job_requests_select on public.job_requests for select using (
  public.is_platform_admin()
  or customer_id = auth.uid()
  or (public.current_user_tenant_id() is not null and status = 'open')
  or exists (select 1 from public.bids b
             where b.job_request_id = job_requests.id
               and b.tenant_id = public.current_user_tenant_id())
);
create policy job_requests_insert on public.job_requests for insert
  with check (customer_id = auth.uid());
create policy job_requests_update on public.job_requests for update
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy job_requests_delete on public.job_requests for delete
  using (customer_id = auth.uid());

-- bids: trade sees/creates own; customer sees + decides on bids for their job
create policy bids_select on public.bids for select using (
  public.is_platform_admin()
  or tenant_id = public.current_user_tenant_id()
  or exists (select 1 from public.job_requests jr
             where jr.id = bids.job_request_id and jr.customer_id = auth.uid())
);
create policy bids_insert on public.bids for insert with check (
  tenant_id = public.current_user_tenant_id()
  and public.is_tenant_active(tenant_id)
  and created_by = auth.uid()
  and exists (select 1 from public.job_requests jr
              where jr.id = job_request_id and jr.status = 'open')
);
create policy bids_update_trade on public.bids for update
  using (tenant_id = public.current_user_tenant_id())
  with check (tenant_id = public.current_user_tenant_id());
create policy bids_update_customer on public.bids for update
  using (exists (select 1 from public.job_requests jr
                 where jr.id = bids.job_request_id and jr.customer_id = auth.uid()))
  with check (exists (select 1 from public.job_requests jr
                 where jr.id = bids.job_request_id and jr.customer_id = auth.uid()));

-- threads + messages: the two parties only
create policy threads_select on public.marketplace_threads for select using (
  customer_id = auth.uid() or tenant_id = public.current_user_tenant_id() or public.is_platform_admin()
);
create policy threads_insert on public.marketplace_threads for insert with check (
  customer_id = auth.uid() or (tenant_id = public.current_user_tenant_id() and public.is_tenant_active(tenant_id))
);
create policy threads_update on public.marketplace_threads for update using (
  customer_id = auth.uid() or tenant_id = public.current_user_tenant_id()
);

create policy msgs_select on public.marketplace_messages for select using (
  exists (select 1 from public.marketplace_threads mt
          where mt.id = marketplace_messages.thread_id
            and (mt.customer_id = auth.uid() or mt.tenant_id = public.current_user_tenant_id()))
);
create policy msgs_insert on public.marketplace_messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from public.marketplace_threads mt
              where mt.id = thread_id
                and (mt.customer_id = auth.uid() or mt.tenant_id = public.current_user_tenant_id()))
);

-- reviews: readable by any signed-in user; only a party to the project can write
create policy reviews_select on public.marketplace_reviews for select using (auth.uid() is not null);
create policy reviews_insert on public.marketplace_reviews for insert with check (
  reviewer_id = auth.uid()
  and exists (select 1 from public.projects pr
              where pr.id = project_id
                and (pr.client_id = auth.uid()
                     or pr.pm_id = auth.uid()
                     or (pr.tenant_id = public.current_user_tenant_id() and public.current_user_role() = 'owner')))
);
