-- Follow-up hardening from the post-deploy re-audit.

-- 1) Storage lockout for marketplace customers (same NULL-tenant class as the
--    profile/contract fixes). reports_read and project_documents_read required
--    the tenant-prefix == current_user_tenant_id(), which is NULL for a
--    marketplace customer, so they couldn't download their own project's report
--    PDFs or documents. has_project_access() already proves access (and was
--    broadened to marketplace customers in migration 25), so drop the redundant
--    tenant-prefix conjunct — matching handovers_read / update_photos_read,
--    which already gate on has_project_access alone.
alter policy reports_read on storage.objects
  using (
    bucket_id = 'reports'
    and public.has_project_access(((storage.foldername(name))[2])::uuid)
  );

alter policy project_documents_read on storage.objects
  using (
    bucket_id = 'project-documents'
    and public.has_project_access(((storage.foldername(name))[2])::uuid)
  );

-- 2) acting_as_client: exclude only owner/PM of the PROJECT'S OWN tenant, not
--    anyone who happens to be owner/PM of some other tenant. Defensive for the
--    future multi-tenant-user case; harmless today (one user = one tenant).
create or replace function public.acting_as_client(p_project uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and auth.uid() = (select client_id from public.projects where id = p_project)
     and not exists (
       select 1
       from public.tenant_members tm
       where tm.user_id = auth.uid()
         and tm.tenant_id = (select tenant_id from public.projects where id = p_project)
         and tm.role in ('owner', 'pm')
     );
$$;

-- 3) Lock down a read helper that was still callable via the API (minor info
--    leak of a project's client/PM pairing). Triggers/policies call it as
--    definer regardless, so revoking direct execute is safe.
revoke execute on function public.other_party_on_project(uuid, uuid) from public, anon, authenticated;
