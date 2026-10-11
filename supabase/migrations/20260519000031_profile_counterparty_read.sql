-- Fix: clients (and non-owner PMs) could not read the name/contact of the
-- other people on their own projects, so the app showed "Project manager"
-- and "Someone" in chat instead of real names.
--
-- Why it broke: profiles_self_read checked "is this profile a member of my
-- tenant?" with a subquery against tenant_members — but tenant_members' own
-- RLS only lets a non-owner see their OWN membership row. So the subquery
-- never found the counterparty's row, and the profile read was denied.
-- Marketplace-customer clients (no tenant_members row at all) were blocked too.
--
-- Fix: a SECURITY DEFINER helper that bypasses tenant_members/projects RLS to
-- answer "may I see this profile?" — true for yourself, anyone who shares a
-- tenant with you, and anyone who is the client or PM on a project you're the
-- client or PM of (covers marketplace customers with no membership).

create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target = auth.uid()
    or public.is_platform_admin()
    -- Same tenant, either direction (member can see fellow members).
    or exists (
      select 1
      from public.tenant_members me
      join public.tenant_members them on them.tenant_id = me.tenant_id
      where me.user_id = auth.uid()
        and them.user_id = target
    )
    -- Project counterparty: we are both parties (client/PM) on one project.
    -- Covers marketplace-customer clients who have no tenant_members row.
    or exists (
      select 1
      from public.projects p
      where (p.client_id = auth.uid() or p.pm_id = auth.uid())
        and (p.client_id = target   or p.pm_id = target)
    );
$$;

comment on function public.can_view_profile(uuid) is
  'True if the caller may read the given profile: self, a tenant-mate, or a client/PM counterparty on a shared project. SECURITY DEFINER so it is not blocked by tenant_members/projects RLS.';

grant execute on function public.can_view_profile(uuid) to authenticated;

-- Repoint the profiles read policy at the helper.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (public.can_view_profile(id));
