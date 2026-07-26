-- =========================================================================
-- Builders Ready — Migration 14: tenant logos bucket
-- =========================================================================
-- Public bucket for each builder's logo (shown in the client mobile app, on
-- invoices and in the handover PDF, so it must be publicly readable).
-- Object key shape:  <tenant_id>/logo-<timestamp>.<ext>
-- Writes are restricted to the tenant owner; the app uploads via the
-- service-role admin client, but the policies keep direct writes safe too.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-logos',
  'tenant-logos',
  true,
  2097152, -- 2 MiB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "tenant_logos_write" on storage.objects;
create policy "tenant_logos_write" on storage.objects for insert with check (
  bucket_id = 'tenant-logos'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists "tenant_logos_update" on storage.objects;
create policy "tenant_logos_update" on storage.objects for update using (
  bucket_id = 'tenant-logos'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists "tenant_logos_delete" on storage.objects;
create policy "tenant_logos_delete" on storage.objects for delete using (
  bucket_id = 'tenant-logos'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.current_user_role() = 'owner'
);
