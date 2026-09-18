-- =========================================================================
-- Builders Ready — Migration 16: estimate sending (PDF + shareable link)
-- =========================================================================
-- Adds the stored PDF path to estimates and a private bucket to hold the
-- rendered quote PDFs. Object key shape: estimate-pdfs/<tenant_id>/<estimate_id>.pdf
-- Write is service_role only (rendered server-side); read is the tenant's
-- owner/PM. Prospects never touch the bucket — the public share page reads
-- the quote by its accept_token via the service role.
-- =========================================================================

alter table public.estimates
  add column if not exists pdf_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estimate-pdfs',
  'estimate-pdfs',
  false,
  52428800, -- 50 MiB
  array['application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "estimate_pdfs_read" on storage.objects;
create policy "estimate_pdfs_read" on storage.objects for select using (
  bucket_id = 'estimate-pdfs'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.current_user_role() in ('owner', 'pm')
);

-- No insert/update/delete policies — service_role bypasses RLS and is the
-- only writer.
