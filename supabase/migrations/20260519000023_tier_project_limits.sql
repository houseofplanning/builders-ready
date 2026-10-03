-- Retune active-project limits per tier: Starter 5, Pro 15, Unlimited unlimited.
-- Prices unchanged (£29 / £69 / £149). Keep aligned with the activeProjectLimit
-- values in packages/shared/billing.ts.

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
    when 'starter'   then 5
    when 'pro'       then 15
    when 'unlimited' then 100000
    else 5  -- trial defaults to Starter cap
  end;

  if active_count > limit_count then
    raise exception 'Project limit reached for tier %: limit=%, attempted=%',
      coalesce(tier, 'starter'), limit_count, active_count
      using errcode = 'check_violation',
            hint    = 'Upgrade the tenant subscription or archive a completed project.';
  end if;

  return new;
end $$;
