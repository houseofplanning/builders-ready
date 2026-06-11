-- =========================================================================
-- Builders Ready — Migration 11: push triggers for decisions and variations
-- =========================================================================
-- Migration 7 already wired push for updates / stages / reports / messages.
-- Migration 9 added invoice insert + paid triggers. This migration plugs
-- the remaining gaps: decisions (raised, decided) and variations (proposed,
-- decided). All triggers call public.send_push from migration 7, which
-- inserts a `notifications` row AND POSTs to Expo Push via pg_net.
-- =========================================================================

-- -------------------------------------------------------------------------
-- on_decision_inserted  →  notify the project's client
-- -------------------------------------------------------------------------
create or replace function public.on_decision_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  raiser_name text;
begin
  select client_id into recipient from public.projects where id = new.project_id;
  if recipient is null or recipient = new.raised_by then return new; end if;
  select full_name into raiser_name from public.profiles where id = new.raised_by;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'decision_raised',
    title        := coalesce(raiser_name, 'Your PM') || ' raised a decision',
    body         := new.title,
    payload      := jsonb_build_object('decision_id', new.id)
  );
  return new;
end $$;

drop trigger if exists decisions_raised_notify on public.decisions;
create trigger decisions_raised_notify
  after insert on public.decisions
  for each row execute procedure public.on_decision_inserted();

-- -------------------------------------------------------------------------
-- on_decision_decided  →  notify the PM/owner who raised it
-- -------------------------------------------------------------------------
create or replace function public.on_decision_decided()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  decider_name text;
  selected_label text;
  outcome text;
begin
  if new.status not in ('accepted', 'rejected') then return new; end if;
  if old.status is not distinct from new.status then return new; end if;
  recipient := new.raised_by;
  if recipient is null or recipient = new.decided_by then return new; end if;
  select full_name into decider_name from public.profiles where id = new.decided_by;
  if new.status = 'accepted' and new.selected_option_id is not null then
    select label into selected_label
      from public.decision_options where id = new.selected_option_id;
    outcome := 'chose: ' || coalesce(selected_label, 'an option');
  elsif new.status = 'rejected' then
    outcome := 'rejected all options';
  else
    outcome := 'decided';
  end if;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'decision_decided',
    title        := coalesce(decider_name, 'The client') || ' ' || outcome,
    body         := new.title,
    payload      := jsonb_build_object('decision_id', new.id)
  );
  return new;
end $$;

drop trigger if exists decisions_decided_notify on public.decisions;
create trigger decisions_decided_notify
  after update on public.decisions
  for each row execute procedure public.on_decision_decided();

-- -------------------------------------------------------------------------
-- on_variation_proposed  →  notify the project's client
-- -------------------------------------------------------------------------
create or replace function public.on_variation_proposed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  proposer_name text;
begin
  select client_id into recipient from public.projects where id = new.project_id;
  if recipient is null or recipient = new.proposed_by then return new; end if;
  select full_name into proposer_name from public.profiles where id = new.proposed_by;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'variation_proposed',
    title        := coalesce(proposer_name, 'Your PM') || ' proposed a variation',
    body         := new.number || ' · ' || new.title,
    payload      := jsonb_build_object('variation_id', new.id)
  );
  return new;
end $$;

drop trigger if exists variations_proposed_notify on public.variations;
create trigger variations_proposed_notify
  after insert on public.variations
  for each row execute procedure public.on_variation_proposed();

-- -------------------------------------------------------------------------
-- on_variation_decided  →  notify the PM/owner who proposed it
-- -------------------------------------------------------------------------
create or replace function public.on_variation_decided()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  decider_name text;
  outcome text;
begin
  if new.status not in ('accepted', 'rejected') then return new; end if;
  if old.status is not distinct from new.status then return new; end if;
  recipient := new.proposed_by;
  if recipient is null or recipient = new.decided_by then return new; end if;
  select full_name into decider_name from public.profiles where id = new.decided_by;
  outcome := case new.status when 'accepted' then 'signed' else 'rejected' end;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'variation_decided',
    title        := 'Variation ' || outcome || ': ' || new.number,
    body         := coalesce(decider_name, 'The client') || ' ' || outcome || ' your variation',
    payload      := jsonb_build_object('variation_id', new.id)
  );
  return new;
end $$;

drop trigger if exists variations_decided_notify on public.variations;
create trigger variations_decided_notify
  after update on public.variations
  for each row execute procedure public.on_variation_decided();
