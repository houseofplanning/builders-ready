-- =========================================================================
-- Builders Ready — Migration 12: project handover PDF bucket
-- =========================================================================
-- Private storage bucket for the end-of-project PDF handover document.
-- Read: anyone with project access (owner, PM, client, platform admin).
-- Write: service_role only — PDFs are generated server-side, never client.
-- Object key shape:  handovers/<tenant_id>/<project_id>.pdf
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'handovers',
  'handovers',
  false,
  104857600, -- 100 MiB (PDFs with embedded photos can be chunky)
  array['application/pdf']
)
on conflict (id) do nothing;

-- Read: caller must belong to the tenant AND have project access to
-- segment[2] (the project_id in the object path).
drop policy if exists "handovers_read" on storage.objects;
create policy "handovers_read" on storage.objects for select using (
  bucket_id = 'handovers'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.has_project_access((storage.foldername(name))[2]::uuid)
);

-- No insert/update/delete policies — service_role bypasses RLS, so the
-- server-side generator can write freely; nothing else can.
