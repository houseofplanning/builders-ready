-- =========================================================================
-- Planning Radar — PR-2: daily cron + saved-search alerts
--
-- NOTE: `alter type ... add value` must be committed before the value is used,
-- so in a fresh apply this file is split: the enum value is added first, then
-- the function. (Applied live via two statements; kept together here for the
-- record.)
-- =========================================================================

alter type public.notification_kind add value if not exists 'planning_alert';

-- -------------------------------------------------------------------------
-- run_planning_alerts — for each saved search with alerts on, find listings
-- synced since the last alert that fall within its radius + filters and push
-- a digest to the builder. No project context.
-- -------------------------------------------------------------------------
create or replace function public.run_planning_alerts() returns integer
language plpgsql security definer set search_path = public as $$
declare
  s record;
  n_new integer;
  sample text;
  total integer := 0;
  r_km numeric;
begin
  for s in
    select * from public.planning_saved_searches
    where alerts_enabled and center_lat is not null and center_lon is not null
  loop
    r_km := coalesce(s.radius_miles, 10) * 1.60934;
    select count(*), (array_agg(l.address order by l.synced_at desc))[1]
      into n_new, sample
    from public.planning_listings l
    where l.latitude is not null and l.longitude is not null
      and l.synced_at > coalesce(s.last_alerted_at, now() - interval '2 days')
      and (cardinality(s.work_categories) = 0 or l.work_category = any(s.work_categories))
      and (cardinality(s.statuses) = 0 or l.status = any(s.statuses))
      and (6371 * acos(greatest(-1, least(1,
            cos(radians(s.center_lat)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians(s.center_lon)) +
            sin(radians(s.center_lat)) * sin(radians(l.latitude))
          )))) <= r_km;

    if n_new > 0 then
      perform public.send_push(
        s.created_by, s.tenant_id, null, 'planning_alert',
        n_new || ' new planning job' || case when n_new = 1 then '' else 's' end || ' near you',
        coalesce(sample, 'Tap to see what''s being planned on your patch.')
          || case when n_new > 1 then ' and more' else '' end,
        jsonb_build_object('saved_search_id', s.id, 'count', n_new)
      );
      update public.planning_saved_searches set last_alerted_at = now() where id = s.id;
      total := total + 1;
    end if;
  end loop;
  return total;
end $$;

-- -------------------------------------------------------------------------
-- Schedules.
-- -------------------------------------------------------------------------
create extension if not exists pg_cron;

-- Saved-search alerts — pure SQL, scheduled now (07:00 daily).
select cron.schedule('planning-alerts-daily', '0 7 * * *', $$select public.run_planning_alerts();$$);

-- Nightly ingest — calls the `planning-ingest` Edge Function via pg_net.
-- Activated at deploy (PR-9), once the function is deployed and the service
-- role key is in Vault. Runs 06:00, before the 07:00 alerts.
--
--   select cron.schedule(
--     'planning-ingest-daily', '0 6 * * *',
--     $job$
--       select net.http_post(
--         url     := 'https://gxebyfkfrzijdpzntrkh.supabase.co/functions/v1/planning-ingest',
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--         ),
--         body    := jsonb_build_object('days', 2)
--       );
--     $job$
--   );
