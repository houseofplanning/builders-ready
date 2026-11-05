-- Tenant-level certificates / insurances for the For Hire profile. Separate
-- from resource_documents (per team-member). Files live in the existing
-- 'resource-docs' bucket under <tenant_id>/certs/...

create table if not exists public.tenant_documents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  doc_type    text not null,
  reference   text,
  issued_on   date,
  expires_on  date,
  file_path   text,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists tenant_documents_tenant_idx on public.tenant_documents(tenant_id);

alter table public.tenant_documents enable row level security;

drop policy if exists tenant_documents_read on public.tenant_documents;
create policy tenant_documents_read on public.tenant_documents
  for select using (
    public.is_platform_admin()
    or tenant_id = public.current_user_tenant_id()
    or exists (select 1 from public.tenants t where t.id = tenant_id and t.discoverable)
  );

drop policy if exists tenant_documents_write on public.tenant_documents;
create policy tenant_documents_write on public.tenant_documents
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm'))
  ) with check (
    tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','pm')
  );
