-- =========================================================================
-- Builders Ready — seed data (local dev + smoke test)
-- =========================================================================
-- Runs after `supabase db reset`. Idempotent; safe to re-run.
--
-- Pre-requisite: three auth.users created via the dashboard with the UUIDs
-- below. If they don't exist, the script logs a NOTICE and exits cleanly.
-- =========================================================================

do $seed$
declare
  -- Tenant A: "Acme Construction"
  owner_a_id   uuid := '00000000-0000-0000-0000-000000000001';
  pm_a_id      uuid := '00000000-0000-0000-0000-000000000002';
  client_a_id  uuid := '00000000-0000-0000-0000-000000000003';

  -- Tenant B: "Bravo Builders" — used for cross-tenant isolation tests
  owner_b_id   uuid := '00000000-0000-0000-0000-000000000004';
  client_b_id  uuid := '00000000-0000-0000-0000-000000000005';

  tenant_a_id  uuid;
  tenant_b_id  uuid;
  project_a_id uuid;
begin
  if not exists (select 1 from auth.users where id = owner_a_id) then
    raise notice 'Seed skipped: auth.user % does not exist. Create it via the dashboard first.', owner_a_id;
    return;
  end if;

  -- ----- Tenant A -----
  insert into public.tenants (slug, name, business_email, owner_user_id, subscription_tier, subscription_status)
  values ('acme', 'Acme Construction Ltd', 'hello@acme.example', owner_a_id, 'pro', 'active')
  on conflict (slug) do update set updated_at = now()
  returning id into tenant_a_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values
    (tenant_a_id, owner_a_id,  'owner'),
    (tenant_a_id, pm_a_id,     'pm'),
    (tenant_a_id, client_a_id, 'client')
  on conflict (tenant_id, user_id) do nothing;

  insert into public.projects (
    tenant_id, name, address_line1, city, postcode,
    client_id, pm_id, start_date, estimated_end_date
  )
  values (
    tenant_a_id, 'Hammersmith Townhouse',
    '42 Larch Road', 'London', 'W6 9AB',
    client_a_id, pm_a_id, current_date, current_date + interval '120 days'
  )
  on conflict do nothing
  returning id into project_a_id;

  -- ----- Tenant B -----
  insert into public.tenants (slug, name, business_email, owner_user_id, subscription_tier, subscription_status)
  values ('bravo', 'Bravo Builders Ltd', 'hello@bravo.example', owner_b_id, 'starter', 'trialing')
  on conflict (slug) do update set updated_at = now()
  returning id into tenant_b_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values
    (tenant_b_id, owner_b_id,  'owner'),
    (tenant_b_id, client_b_id, 'client')
  on conflict (tenant_id, user_id) do nothing;

  raise notice 'Seed completed. Tenant A = %, Tenant B = %', tenant_a_id, tenant_b_id;
end
$seed$;
