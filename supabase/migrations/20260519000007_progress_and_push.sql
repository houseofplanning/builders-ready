-- =========================================================================
-- Builders Ready — Migration 7/9: project progress trigger + push pipeline
-- =========================================================================
-- Auto-recompute project.progress_percent + current_stage_id on any stage
-- change, then deliver push notifications via the Expo Push API using
-- pg_net to POST from Postgres directly.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Recompute project progress on stage change
-- -------------------------------------------------------------------------
create or replace function public.recompute_project_progress(p uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  total int;
  done  int;
  pct   int;
  cur   uuid;
begin
  select count(*) into total from public.project_stages where project_id = p;
  if total = 0 then
    update public.projects
       set progress_percent = 0,
           current_stage_id = null
     where id = p;
    return;
  end if;

  select count(*) into done
    from public.project_stages
    where project_id = p and status = 'complete';

  pct := round((done::numeric / total::numeric) * 100);

  select id into cur
    from public.project_stages
    where project_id = p
    order by
      case status
        when 'in_progress' then 1
        when 'delayed'     then 2
        when 'not_started' then 3
        when 'complete'    then 4
      end,
      position asc
    limit 1;

  update public.projects
     set progress_percent = pct,
         current_stage_id = cur
   where id = p;
end $$;

create or replace function public.on_stage_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_project_progress(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end $$;

drop trigger if exists stages_recompute_progress on public.project_stages;
create trigger stages_recompute_progress
  after insert or update or delete on public.project_stages
  for each row execute procedure public.on_stage_change();

-- -------------------------------------------------------------------------
-- Push notifications via Expo Push + pg_net
-- -------------------------------------------------------------------------
create or replace function public.send_push(
  recipient_id   uuid,
  t_id           uuid,
  proj_id        uuid,
  kind           public.notification_kind,
  title          text,
  body           text,
  payload        jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  tokens text[];
  msg    jsonb;
begin
  -- 1. Persist in-app notification row regardless of push delivery.
  insert into public.notifications (tenant_id, user_id, project_id, kind, payload)
  values (
    t_id, recipient_id, proj_id, kind,
    payload || jsonb_build_object('title', title, 'body', body)
  );

  -- 2. Look up the recipient's push tokens (scoped to their tenant).
  select array_agg(expo_token) into tokens
  from public.push_tokens
  where user_id = recipient_id and tenant_id = t_id;

  if tokens is null or array_length(tokens, 1) = 0 then
    return;
  end if;

  msg := jsonb_build_object(
    'to',    to_jsonb(tokens),
    'title', title,
    'body',  body,
    'sound', 'default',
    'data',  payload || jsonb_build_object(
               'tenant_id', t_id, 'project_id', proj_id, 'kind', kind::text
             )
  );

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept',       'application/json'
    ),
    body    := msg
  );
end $$;

-- "Other party" helper
create or replace function public.other_party_on_project(p_proj uuid, p_actor uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when pr.pm_id     = p_actor then pr.client_id
    when pr.client_id = p_actor then pr.pm_id
    else pr.client_id
  end
  from public.projects pr where pr.id = p_proj;
$$;

-- New update → notify client
create or replace function public.on_update_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  poster_name text;
begin
  recipient := public.other_party_on_project(new.project_id, new.posted_by);
  if recipient is null then return new; end if;
  select full_name into poster_name from public.profiles where id = new.posted_by;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'update_posted',
    title        := coalesce(poster_name, 'Your PM') || ' posted an update',
    body         := coalesce(new.headline, left(new.body, 120)),
    payload      := jsonb_build_object('update_id', new.id)
  );
  return new;
end $$;
drop trigger if exists project_updates_notify on public.project_updates;
create trigger project_updates_notify after insert on public.project_updates
  for each row execute procedure public.on_update_inserted();

-- Stage status changed → notify client
create or replace function public.on_stage_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  proj_name text;
  status_label text;
begin
  if new.status is not distinct from old.status then return new; end if;
  select client_id, name into recipient, proj_name from public.projects where id = new.project_id;
  if recipient is null then return new; end if;
  status_label := case new.status
    when 'complete'    then 'completed'
    when 'in_progress' then 'started'
    when 'delayed'     then 'flagged as delayed'
    else 'updated'
  end;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'stage_advanced',
    title        := 'Stage ' || status_label,
    body         := new.name || ' on ' || coalesce(proj_name, 'your project'),
    payload      := jsonb_build_object('stage_id', new.id, 'new_status', new.status)
  );
  return new;
end $$;
drop trigger if exists project_stages_notify on public.project_stages;
create trigger project_stages_notify after update on public.project_stages
  for each row execute procedure public.on_stage_status_changed();

-- Report posted → notify client
create or replace function public.on_report_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
begin
  select client_id into recipient from public.projects where id = new.project_id;
  if recipient is null then return new; end if;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'report_posted',
    title        := 'New report: ' || new.title,
    body         := case new.kind
                       when 'pdf' then 'PDF report — tap to open'
                       else coalesce(left(new.summary, 120), 'Tap to read')
                    end,
    payload      := jsonb_build_object('report_id', new.id)
  );
  return new;
end $$;
drop trigger if exists reports_notify on public.reports;
create trigger reports_notify after insert on public.reports
  for each row execute procedure public.on_report_inserted();

-- Message sent → notify the other party
create or replace function public.on_message_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  sender_name text;
begin
  recipient := public.other_party_on_project(new.project_id, new.sender_id);
  if recipient is null or recipient = new.sender_id then return new; end if;
  select full_name into sender_name from public.profiles where id = new.sender_id;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'message_received',
    title        := 'New message from ' || coalesce(sender_name, 'your project'),
    body         := left(new.body, 140),
    payload      := jsonb_build_object('message_id', new.id)
  );
  return new;
end $$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute procedure public.on_message_inserted();
