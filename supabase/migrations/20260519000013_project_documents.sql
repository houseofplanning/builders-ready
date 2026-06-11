-- =========================================================================
-- Builders Ready — Migration 13: project documents (document vault)
-- =========================================================================
-- A per-project document store: contracts, plans, certificates, warranties.
-- Both the builder's team (owner / PM) and the project's client can upload
-- and view documents on projects they have access to — gated by the existing
-- has_project_access() helper.
--
-- Files live in the private `project-documents` storage bucket under the key
-- shape:  <tenant_id>/<project_id>/<uuid>-<filename>
-- =========================================================================

-- Category used to group documents in the UI.
do $$ begin
  create type public.document_category as enum (
    'contract', 'plans', 'certificates', 'warranties', 'other'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  uploaded_by   uuid references auth.users(id) on delete set null,
  name          text not null,
  category      public.document_category not null default 'other',
  storage_path  text not null,
  mime_type     text,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

create index if not exists documents_project_created_idx
  on public.documents (project_id, created_at desc);

alter table public.documents enable row level security;

-- Read: anyone with access to the project (owner, PM, the client, admin).
drop policy if exists "documents_read" on public.documents;
create policy "documents_read" on public.documents for select
  using (public.has_project_access(project_id));

-- Insert: must have project access, write into your own tenant, and stamp
-- yourself as the uploader.
drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents for insert
  with check (
    public.has_project_access(project_id)
    and tenant_id = public.current_user_tenant_id()
    and uploaded_by = auth.uid()
  );

-- Delete: the uploader can remove their own file; owners and PMs can remove
-- any document on a project they can access.
drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents for delete
  using (
    public.has_project_access(project_id)
    and (
      uploaded_by = auth.uid()
      or public.current_user_role() in ('owner', 'pm')
    )
  );

-- -------------------------------------------------------------------------
-- Storage bucket: project-documents (private)
-- -------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  52428800, -- 50 MiB
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Object key shape: <tenant_id>/<project_id>/<file>. Read / write / delete
-- gated on tenant match AND project access — which covers both the builder's
-- team and the project's client.
drop policy if exists "project_documents_read" on storage.objects;
create policy "project_documents_read" on storage.objects for select using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.has_project_access((storage.foldername(name))[2]::uuid)
);

drop policy if exists "project_documents_write" on storage.objects;
create policy "project_documents_write" on storage.objects for insert with check (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.has_project_access((storage.foldername(name))[2]::uuid)
);

drop policy if exists "project_documents_delete" on storage.objects;
create policy "project_documents_delete" on storage.objects for delete using (
  bucket_id = 'project-documents'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.has_project_access((storage.foldername(name))[2]::uuid)
);
