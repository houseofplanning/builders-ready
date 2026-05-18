-- =========================================================================
-- Builders Ready — Migration 8/9: billing guards
-- =========================================================================
-- Hard-block on project creation past the tier limit. Stripe webhook
-- idempotency table. Keep tier limits aligned with packages/shared/billing.ts.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Enforce active-project limit per tier
-- -------------------------------------------------------------------------
create or replace function public.enforce_project_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  active_count int;
  tier text;
  limit_count int;
begin
  if new.status not in ('active','on_hold') then return new; end if;

  select count(*) into active_count
  from public.projects
  where tenant_id = new.tenant_id
    and status in ('active','on_hold');

  select subscription_tier::text into tier
  from public.tenants where id = new.tenant_id;

  limit_count := case tier
    when 'starter'   then 10
    when 'pro'       then 50
    when 'unlimited' then 100000
    else 10  -- trial defaults to Starter cap
  end;

  if active_count > limit_count then
    raise exception 'Project limit reached for tier %: limit=%, attempted=%',
      coalesce(tier, 'starter'), limit_count, active_count
      using errcode = 'check_violation',
            hint    = 'Upgrade the tenant subscription or archive a completed project.';
  end if;

  return new;
end $$;

drop trigger if exists projects_enforce_limit on public.projects;
create trigger projects_enforce_limit
  after insert or update of status on public.projects
  for each row execute procedure public.enforce_project_limit();

-- -------------------------------------------------------------------------
-- webhook_events — Stripe idempotency
-- -------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id                uuid primary key default gen_random_uuid(),
  stripe_event_id   text not null unique,
  event_type        text not null,
  tenant_id         uuid references public.tenants(id) on delete set null,
  payload           jsonb not null,
  processed_at      timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

drop policy if exists webhook_events_platform_only on public.webhook_events;
create policy webhook_events_platform_only on public.webhook_events
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());
