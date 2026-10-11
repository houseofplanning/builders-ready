-- =========================================================================
-- Builders Ready — Migration 44: harden quote_templates write policy
-- =========================================================================
-- The original write policy's WITH CHECK only pinned tenant_id, while USING
-- also required owner/PM on an active tenant. Because INSERT is gated by
-- WITH CHECK alone, a non-owner member could insert a tenant-scoped template.
-- Mirror the USING predicate in WITH CHECK to close the role-enforcement gap.
-- (No cross-tenant or platform-catalogue exposure existed; this is defence.)
-- =========================================================================
drop policy if exists quote_templates_write on public.quote_templates;
create policy quote_templates_write on public.quote_templates
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(tenant_id)
        and public.current_user_role() in ('owner','pm'))
  ) with check (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(tenant_id)
        and public.current_user_role() in ('owner','pm'))
  );
