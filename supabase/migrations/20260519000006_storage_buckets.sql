-- =========================================================================
-- Builders Ready — Migration 6/9: storage buckets + tenant-scoped policies
-- =========================================================================
-- Object key shape:
--   update-photos / <tenant_id> / <project_id> / <update_id> / file.jpg
--   reports       / <tenant_id> / <project_id> / file.pdf
--   avatars       / <user_id> / avatar.jpg          (user-keyed, public-read)
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('update-photos', 'update-photos', false, 20971520,  -- 20 MiB
   array['image/jpeg','image/png','image/webp','image/heic']),
  ('reports', 'reports', false, 41943040,              -- 40 MiB
   array['application/pdf']),
  ('avatars', 'avatars', true, 2097152,                -- 2 MiB
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- update-photos: tenant-prefixed; visible if caller can access the project.
-- segment[1] = tenant_id, segment[2] = project_id
-- -------------------------------------------------------------------------
drop policy if exists "update_photos_read" on storage.objects;
create policy "update_photos_read" on storage.objects for select using (
  bucket_id = 'update-photos'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.has_project_access((storage.foldername(name))[2]::uuid)
);

drop policy if exists "update_photos_write" on storage.objects;
create policy "update_photos_write" on storage.objects for insert with check (
  bucket_id = 'update-photos'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (
    public.is_platform_admin()
    or public.current_user_role() = 'owner'
    or exists (
      select 1 from public.projects pr
      where pr.id = (storage.foldername(name))[2]::uuid
        and pr.pm_id = auth.uid()
    )
  )
);

drop policy if exists "update_photos_delete" on storage.objects;
create policy "update_photos_delete" on storage.objects for delete using (
  bucket_id = 'update-photos'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (
    public.is_platform_admin()
    or public.current_user_role() = 'owner'
    or exists (
      select 1 from public.projects pr
      where pr.id = (storage.foldername(name))[2]::uuid
        and pr.pm_id = auth.uid()
    )
  )
);

-- -------------------------------------------------------------------------
-- reports: same tenant-prefixed pattern.
-- -------------------------------------------------------------------------
drop policy if exists "reports_read" on storage.objects;
create policy "reports_read" on storage.objects for select using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.has_project_access((storage.foldername(name))[2]::uuid)
);

drop policy if exists "reports_write" on storage.objects;
create policy "reports_write" on storage.objects for insert with check (
  bucket_id = 'reports'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (
    public.is_platform_admin()
    or public.current_user_role() = 'owner'
    or exists (
      select 1 from public.projects pr
      where pr.id = (storage.foldername(name))[2]::uuid
        and pr.pm_id = auth.uid()
    )
  )
);

-- -------------------------------------------------------------------------
-- avatars: public-read; users write to their own user_id folder only.
-- Not tenant-scoped (avatars are personal, follow the user across roles).
-- -------------------------------------------------------------------------
drop policy if exists "avatars_self_write" on storage.objects;
create policy "avatars_self_write" on storage.objects for insert with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_self_update" on storage.objects;
create policy "avatars_self_update" on storage.objects for update using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_self_delete" on storage.objects;
create policy "avatars_self_delete" on storage.objects for delete using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
