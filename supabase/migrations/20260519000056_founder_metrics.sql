-- =========================================================================
-- Builders Ready — Founder metrics (platform-admin only)
-- =========================================================================
-- A single SECURITY DEFINER function that returns AGGREGATE, de-identified
-- business metrics across all tenants, for the founder dashboard at /admin.
--
-- GDPR note: this returns only counts, sums and averages. It never returns
-- any individual's name, email, address or other personal data. Access is
-- hard-gated to platform_admins; anyone else gets an exception.
-- =========================================================================

-- Make sure the founder is a platform admin (idempotent, by email).
insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'oddiemehraj@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.founder_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'not authorised';
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    -- ---- Growth --------------------------------------------------------
    'builders_total',     (select count(*) from tenants),
    'builders_new_7d',    (select count(*) from tenants where created_at >= now() - interval '7 days'),
    'builders_new_30d',   (select count(*) from tenants where created_at >= now() - interval '30 days'),
    'homeowners_total',   (select count(*) from profiles p
                             where not exists (select 1 from tenants t where t.owner_user_id = p.id)
                               and not exists (select 1 from tenant_members m where m.user_id = p.id)),
    'homeowners_new_30d', (select count(*) from profiles p
                             where p.created_at >= now() - interval '30 days'
                               and not exists (select 1 from tenants t where t.owner_user_id = p.id)
                               and not exists (select 1 from tenant_members m where m.user_id = p.id)),
    'signups_by_week',    (select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'count', c) order by wk), '[]'::jsonb)
                             from (select date_trunc('week', created_at)::date as wk, count(*) c
                                     from tenants
                                    where created_at >= now() - interval '56 days'
                                    group by 1) s),

    -- ---- Subscriptions / revenue --------------------------------------
    'subs_active',    (select count(*) from tenants where subscription_status = 'active'),
    'subs_trialing',  (select count(*) from tenants where subscription_status = 'trialing'),
    'subs_past_due',  (select count(*) from tenants where subscription_status in ('past_due','unpaid')),
    'subs_cancelled', (select count(*) from tenants where subscription_status in ('cancelled','suspended')),
    'tier_split',     (select jsonb_build_object(
                           'starter',   count(*) filter (where subscription_tier = 'starter'),
                           'pro',       count(*) filter (where subscription_tier = 'pro'),
                           'unlimited', count(*) filter (where subscription_tier = 'unlimited'))
                         from tenants where subscription_status in ('active','trialing')),
    -- Indicative MRR from ACTIVE paying subs at monthly list price (pence).
    'mrr_pence',      (select coalesce(sum(case subscription_tier
                             when 'starter' then 2900 when 'pro' then 6900
                             when 'unlimited' then 14900 else 0 end), 0)
                         from tenants where subscription_status = 'active'),

    -- ---- Quoting activity ---------------------------------------------
    'estimates_total',   (select count(*) from estimates),
    'estimates_30d',     (select count(*) from estimates where created_at >= now() - interval '30 days'),
    'estimates_sent',    (select count(*) from estimates where status = 'sent'),
    'estimates_accepted',(select count(*) from estimates where status = 'accepted'),
    'estimates_declined',(select count(*) from estimates where status = 'declined'),
    'win_rate_bp',       (select case when count(*) filter (where status in ('accepted','declined')) > 0
                             then round(count(*) filter (where status = 'accepted') * 10000.0
                                        / count(*) filter (where status in ('accepted','declined')))
                             else null end from estimates),
    'avg_estimate_pence',(select coalesce(round(avg(total_pence)), 0)::bigint
                             from estimates where total_pence > 0),

    -- ---- Money flowing through ----------------------------------------
    'invoices_total', (select count(*) from invoices),
    'invoices_paid',  (select count(*) from invoices where status = 'paid'),
    'gmv_paid_pence', (select coalesce(sum(amount_gbp_pence), 0) from invoices where status = 'paid'),

    -- ---- Marketplace --------------------------------------------------
    'jobs_total',   (select count(*) from job_requests),
    'jobs_open',    (select count(*) from job_requests where status = 'open'),
    'jobs_30d',     (select count(*) from job_requests where created_at >= now() - interval '30 days'),
    'jobs_matched', (select count(*) from job_requests where status = 'matched'),
    'bids_total',   (select count(*) from bids),
    'reviews_count',(select count(*) from marketplace_reviews),
    'avg_rating',   (select round(avg(rating), 2) from marketplace_reviews),
    'jobs_by_category', (select coalesce(jsonb_agg(jsonb_build_object('key', trade_category, 'count', c) order by c desc), '[]'::jsonb)
                           from (select trade_category, count(*) c from job_requests
                                  group by 1 order by c desc limit 8) x),
    'jobs_by_region',   (select coalesce(jsonb_agg(jsonb_build_object('key', area, 'count', c) order by c desc), '[]'::jsonb)
                           from (select upper(split_part(postcode, ' ', 1)) area, count(*) c
                                   from job_requests where postcode is not null and postcode <> ''
                                  group by 1 order by c desc limit 8) x),

    -- ---- Planning Radar -----------------------------------------------
    'listings_total', (select count(*) from planning_listings),
    'actions_total',  (select count(*) from planning_listing_actions),
    'actions_by_stage', (select jsonb_build_object(
                             'saved',      count(*) filter (where stage = 'saved'),
                             'approached', count(*) filter (where stage = 'approached'),
                             'replied',    count(*) filter (where stage = 'replied'),
                             'won',        count(*) filter (where stage = 'won'))
                           from planning_listing_actions)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.founder_dashboard() from public;
grant execute on function public.founder_dashboard() to authenticated;

comment on function public.founder_dashboard() is
  'Aggregate, de-identified platform metrics for the founder dashboard. Platform-admin only.';
