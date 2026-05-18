-- =========================================================================
-- Builders Ready — Migration 4/9: project core tables
-- =========================================================================
-- All business tables carry a `tenant_id` for RLS to filter on directly,
-- without joins per row. An assert_tenant_match() trigger keeps it
-- consistent with the parent project's tenant.
-- =========================================================================

-- -------------------------------------------------------------------------
-- projects
-- -------------------------------------------------------------------------
create table if not exists public.projects (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants(id) on delete cascade,
  name                     text not null,
  address_line1            text not null,
  address_line2            text,
  city                     text not null,
  postcode                 text not null,
  client_id                uuid not null references public.profiles(id) on delete restrict,
  pm_id                    uuid not null references public.profiles(id) on delete restrict,
  status                   public.project_status not null default 'active',
  start_date               date not null,
  estimated_end_date       date not null,
  actual_end_date          date,
  progress_percent         smallint not null default 0
                             check (progress_percent between 0 and 100),
  current_stage_id         uuid,
  planning_application_id  text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists projects_tenant_idx on public.projects(tenant_id, status);
create index if not exists projects_client_idx on public.projects(tenant_id, client_id);
create index if not exists projects_pm_idx     on public.projects(tenant_id, pm_id);

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before update on public.projects
  for each row execute procedure public.touch_updated_at();

-- -------------------------------------------------------------------------
-- project_stages
-- -------------------------------------------------------------------------
create table if not exists public.project_stages (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  position          smallint not null,
  name              text not null,
  status            public.stage_status not null default 'not_started',
  start_date        date not null,
  target_end_date   date not null,
  actual_end_date   date,
  pm_commentary     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, position)
);

create index if not exists stages_project_idx on public.project_stages(tenant_id, project_id, position);

drop trigger if exists stages_touch on public.project_stages;
create trigger stages_touch
  before update on public.project_stages
  for each row execute procedure public.touch_updated_at();

alter table public.projects
  drop constraint if exists projects_current_stage_fk,
  add constraint projects_current_stage_fk
    foreign key (current_stage_id) references public.project_stages(id)
    on delete set null deferrable initially deferred;

-- -------------------------------------------------------------------------
-- project_updates (the daily-feed entries)
-- -------------------------------------------------------------------------
create table if not exists public.project_updates (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  stage_id          uuid not null references public.project_stages(id) on delete restrict,
  posted_by         uuid not null references public.profiles(id) on delete restrict,
  headline          text,
  body              text not null,
  decision_needed   text,
  posted_at         timestamptz not null default now()
);

create index if not exists updates_project_idx
  on public.project_updates(tenant_id, project_id, posted_at desc);

-- -------------------------------------------------------------------------
-- update_photos
-- -------------------------------------------------------------------------
create table if not exists public.update_photos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  update_id       uuid not null references public.project_updates(id) on delete cascade,
  storage_path    text not null,
  width           int not null,
  height          int not null,
  byte_size       int not null,
  position        smallint not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists photos_update_idx
  on public.update_photos(tenant_id, update_id, position);

-- -------------------------------------------------------------------------
-- reports
-- -------------------------------------------------------------------------
create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  posted_by           uuid not null references public.profiles(id) on delete restrict,
  title               text not null,
  kind                public.report_kind not null,
  pdf_storage_path    text,
  summary             text,
  next_week           text,
  risks               text,
  decisions_needed    text,
  posted_at           timestamptz not null default now(),
  acknowledged_at     timestamptz,
  acknowledged_by     uuid references public.profiles(id),
  check (
    (kind = 'pdf' and pdf_storage_path is not null)
    or (kind = 'structured' and summary is not null)
  )
);

create index if not exists reports_project_idx
  on public.reports(tenant_id, project_id, posted_at desc);

-- -------------------------------------------------------------------------
-- messages (1 thread per project)
-- -------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  sender_id    uuid not null references public.profiles(id) on delete restrict,
  body         text not null,
  read_at      timestamptz,
  sent_at      timestamptz not null default now()
);

create index if not exists messages_project_idx
  on public.messages(tenant_id, project_id, sent_at);

-- -------------------------------------------------------------------------
-- notifications
-- -------------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  kind         public.notification_kind not null,
  payload      jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications(tenant_id, user_id, created_at desc);

-- -------------------------------------------------------------------------
-- push_tokens (Expo push tokens, one per device per user)
-- -------------------------------------------------------------------------
create table if not exists public.push_tokens (
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  expo_token   text not null,
  platform     text not null check (platform in ('ios','android')),
  created_at   timestamptz not null default now(),
  primary key (user_id, expo_token)
);

create index if not exists push_tokens_tenant_idx on public.push_tokens(tenant_id);

-- -------------------------------------------------------------------------
-- tenant-id integrity guard — fires on every business-table insert/update
-- to assert that `tenant_id` matches the parent project's tenant_id.
-- (Postgres doesn't allow subquery CHECKs, so we trigger.)
-- -------------------------------------------------------------------------
create or replace function public.assert_tenant_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  parent_tenant uuid;
begin
  if tg_table_name = 'project_stages' or tg_table_name = 'project_updates'
     or tg_table_name = 'reports' or tg_table_name = 'messages'
     or tg_table_name = 'notifications' then
    if new.project_id is null then return new; end if;
    select tenant_id into parent_tenant from public.projects where id = new.project_id;
  elsif tg_table_name = 'update_photos' then
    select tenant_id into parent_tenant from public.project_updates where id = new.update_id;
  else
    return new;
  end if;

  if parent_tenant is null then
    raise exception 'assert_tenant_match: parent not found for %', tg_table_name;
  end if;
  if new.tenant_id is null then
    new.tenant_id := parent_tenant;
  elsif new.tenant_id <> parent_tenant then
    raise exception 'tenant_id mismatch on %: row=% parent=%', tg_table_name, new.tenant_id, parent_tenant
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists stages_tenant_match    on public.project_stages;
drop trigger if exists updates_tenant_match   on public.project_updates;
drop trigger if exists photos_tenant_match    on public.update_photos;
drop trigger if exists reports_tenant_match   on public.reports;
drop trigger if exists messages_tenant_match  on public.messages;
drop trigger if exists notifications_tenant_match on public.notifications;

create trigger stages_tenant_match    before insert or update on public.project_stages    for each row execute procedure public.assert_tenant_match();
create trigger updates_tenant_match   before insert or update on public.project_updates   for each row execute procedure public.assert_tenant_match();
create trigger photos_tenant_match    before insert or update on public.update_photos     for each row execute procedure public.assert_tenant_match();
create trigger reports_tenant_match   before insert or update on public.reports           for each row execute procedure public.assert_tenant_match();
create trigger messages_tenant_match  before insert or update on public.messages          for each row execute procedure public.assert_tenant_match();
