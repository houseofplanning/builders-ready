-- =========================================================================
-- Marketplace — Phase 4a: let a marketplace customer reach their matched
-- project without a tenant membership. A customer is the project's client_id
-- but has no tenant_members row, so the existing tenant-scoped policies lock
-- them out. We add a standalone client-read path.
-- =========================================================================

-- Extra SELECT policy on projects (policies are OR'd): the client can always
-- read a project they are the client on, regardless of tenant membership.
drop policy if exists projects_client_read on public.projects;
create policy projects_client_read on public.projects
  for select using (client_id = auth.uid());

-- Broaden has_project_access so the client branch stands alone (no tenant
-- match required). Trade/PM/owner access is unchanged. This cascades read
-- access to project_stages, project_updates, reports, etc. for the client.
create or replace function public.has_project_access(p uuid)
returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return public.is_platform_admin()
    or exists (
      select 1 from public.projects pr
      where pr.id = p and pr.client_id = auth.uid()
    )
    or exists (
      select 1
      from public.projects pr
      where pr.id = p
        and pr.tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(pr.tenant_id)
        and (pr.pm_id = auth.uid() or public.current_user_role() = 'owner')
    );
end $$;
