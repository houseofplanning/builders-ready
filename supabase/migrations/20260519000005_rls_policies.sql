-- =========================================================================
-- Builders Ready — Migration 5/9: Row-Level Security
-- =========================================================================
-- Three-predicate template on every policy:
--   1. ROW BELONGS TO CALLER'S TENANT
--   2. TENANT IS IN AN ACTIVE BILLING STATE
--   3. CALLER HAS ROW-LEVEL ROLE ACCESS (client/pm/owner)
-- Platform admins bypass via OR is_platform_admin().
-- =========================================================================

alter table public.tenants          enable row level security;
alter table public.tenant_members   enable row level security;
alter table public.platform_admins  enable row level security;
alter table public.invitations      enable row level security;
alter table public.profiles         enable row level security;
alter table public.projects         enable row level security;
alter table public.project_stages   enable row level security;
alter table public.project_updates  enable row level security;
alter table public.update_photos    enable row level security;
alter table public.reports          enable row level security;
alter table public.messages         enable row level security;
alter table public.notifications    enable row level security;
alter table public.push_tokens      enable row level security;

-- -------------------------------------------------------------------------
-- tenants
-- -------------------------------------------------------------------------
drop policy if exists tenants_self_read on public.tenants;
create policy tenants_self_read on public.tenants
  for select using (
    public.is_platform_admin()
    or id = public.current_user_tenant_id()
  );

drop policy if exists tenants_owner_update on public.tenants;
create policy tenants_owner_update on public.tenants
  for update using (
    id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  ) with check (
    id = public.current_user_tenant_id()
  );

drop policy if exists tenants_platform_all on public.tenants;
create policy tenants_platform_all on public.tenants
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- -------------------------------------------------------------------------
-- tenant_members
-- -------------------------------------------------------------------------
drop policy if exists tenant_members_self_read on public.tenant_members;
create policy tenant_members_self_read on public.tenant_members
  for select using (
    user_id = auth.uid()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.current_user_role() = 'owner'
    )
    or public.is_platform_admin()
  );

drop policy if exists tenant_members_owner_write on public.tenant_members;
create policy tenant_members_owner_write on public.tenant_members
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.current_user_role() = 'owner'
    )
  ) with check (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.current_user_role() = 'owner'
    )
  );

-- -------------------------------------------------------------------------
-- platform_admins — only platform admins can read or write
-- -------------------------------------------------------------------------
drop policy if exists platform_admins_all on public.platform_admins;
create policy platform_admins_all on public.platform_admins
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- -------------------------------------------------------------------------
-- invitations
-- -------------------------------------------------------------------------
drop policy if exists invitations_tenant_read on public.invitations;
create policy invitations_tenant_read on public.invitations
  for select using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.current_user_role() in ('owner','pm')
    )
  );

drop policy if exists invitations_tenant_write on public.invitations;
create policy invitations_tenant_write on public.invitations
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.current_user_role() in ('owner','pm')
    )
  ) with check (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.current_user_role() in ('owner','pm')
    )
  );

-- -------------------------------------------------------------------------
-- profiles — self + same-tenant counterparties
-- -------------------------------------------------------------------------
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (
    id = auth.uid()
    or public.is_platform_admin()
    or exists (
      select 1 from public.tenant_members tm
      where tm.user_id = public.profiles.id
        and tm.tenant_id = public.current_user_tenant_id()
    )
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- -------------------------------------------------------------------------
-- projects
-- -------------------------------------------------------------------------
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects
  for select using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        client_id = auth.uid()
        or pm_id   = auth.uid()
        or public.current_user_role() = 'owner'
      )
    )
  );

drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() = 'owner'
        or (public.current_user_role() = 'pm' and pm_id = auth.uid())
      )
    )
  ) with check (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and (
        public.current_user_role() = 'owner'
        or (public.current_user_role() = 'pm' and pm_id = auth.uid())
      )
    )
  );

-- -------------------------------------------------------------------------
-- project_stages
-- -------------------------------------------------------------------------
drop policy if exists stages_read on public.project_stages;
create policy stages_read on public.project_stages
  for select using (public.has_project_access(project_id));

drop policy if exists stages_write on public.project_stages;
create policy stages_write on public.project_stages
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() = 'owner'
        or exists (
          select 1 from public.projects pr
          where pr.id = project_id and pr.pm_id = auth.uid()
        )
      )
    )
  ) with check (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and (
        public.current_user_role() = 'owner'
        or exists (
          select 1 from public.projects pr
          where pr.id = project_id and pr.pm_id = auth.uid()
        )
      )
    )
  );

-- -------------------------------------------------------------------------
-- project_updates
-- -------------------------------------------------------------------------
drop policy if exists updates_read on public.project_updates;
create policy updates_read on public.project_updates
  for select using (public.has_project_access(project_id));

drop policy if exists updates_write on public.project_updates;
create policy updates_write on public.project_updates
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() = 'owner'
        or exists (
          select 1 from public.projects pr
          where pr.id = project_id and pr.pm_id = auth.uid()
        )
      )
    )
  ) with check (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and (
        public.current_user_role() = 'owner'
        or (
          posted_by = auth.uid() and exists (
            select 1 from public.projects pr
            where pr.id = project_id and pr.pm_id = auth.uid()
          )
        )
      )
    )
  );

-- -------------------------------------------------------------------------
-- update_photos
-- -------------------------------------------------------------------------
drop policy if exists photos_read on public.update_photos;
create policy photos_read on public.update_photos
  for select using (
    exists (
      select 1 from public.project_updates u
      where u.id = update_id and public.has_project_access(u.project_id)
    )
  );

drop policy if exists photos_write on public.update_photos;
create policy photos_write on public.update_photos
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and exists (
        select 1 from public.project_updates u
        join public.projects pr on pr.id = u.project_id
        where u.id = update_id
          and (pr.pm_id = auth.uid() or public.current_user_role() = 'owner')
      )
    )
  ) with check (
    public.is_platform_admin()
    or tenant_id = public.current_user_tenant_id()
  );

-- -------------------------------------------------------------------------
-- reports
-- -------------------------------------------------------------------------
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports
  for select using (public.has_project_access(project_id));

drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() = 'owner'
        or exists (
          select 1 from public.projects pr
          where pr.id = project_id and pr.pm_id = auth.uid()
        )
      )
    )
  ) with check (
    public.is_platform_admin()
    or tenant_id = public.current_user_tenant_id()
  );

-- Clients can ack reports (and only that — checked via with check).
drop policy if exists reports_client_ack on public.reports;
create policy reports_client_ack on public.reports
  for update using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (acknowledged_by = auth.uid());

-- -------------------------------------------------------------------------
-- messages
-- -------------------------------------------------------------------------
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select using (public.has_project_access(project_id));

drop policy if exists messages_send on public.messages;
create policy messages_send on public.messages
  for insert with check (
    sender_id = auth.uid()
    and tenant_id = public.current_user_tenant_id()
    and public.has_project_access(project_id)
  );

drop policy if exists messages_mark_read on public.messages;
create policy messages_mark_read on public.messages
  for update using (public.has_project_access(project_id))
  with check (tenant_id = public.current_user_tenant_id());

-- -------------------------------------------------------------------------
-- notifications
-- -------------------------------------------------------------------------
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select using (
    public.is_platform_admin()
    or (user_id = auth.uid() and tenant_id = public.current_user_tenant_id())
  );

drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and tenant_id = public.current_user_tenant_id());

-- -------------------------------------------------------------------------
-- push_tokens
-- -------------------------------------------------------------------------
drop policy if exists push_tokens_self on public.push_tokens;
create policy push_tokens_self on public.push_tokens
  for all using (
    user_id = auth.uid() and tenant_id = public.current_user_tenant_id()
  ) with check (
    user_id = auth.uid() and tenant_id = public.current_user_tenant_id()
  );
