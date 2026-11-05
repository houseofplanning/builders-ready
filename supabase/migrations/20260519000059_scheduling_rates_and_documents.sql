-- =========================================================================
-- Builders Ready — Migration 59: resource cost refinements + certifications
-- =========================================================================
-- Perm-staff salary basis (via rate_unit 'annual' from migration 58) + an
-- optional on-cost uplift (employer NI, pension, holiday) for true daily cost;
-- subcontractor engagement window (from/to); and documents/certs per resource
-- with expiry, so the team can keep everyone on site compliant.
-- =========================================================================

alter table public.resources add column if not exists engaged_from date;
alter table public.resources add column if not exists engaged_to date;
alter table public.resources add column if not exists on_cost_percent numeric(5,2) not null default 0
  check (on_cost_percent >= 0 and on_cost_percent <= 200);

-- cost trigger now handles annual salary (/232 working days), day, hour, +on-cost
create or replace function public.compute_assignment_cost()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  hrs numeric; rate bigint; unit public.rate_unit; oncost numeric; base numeric;
begin
  select cost_rate_pence, cost_rate_unit, coalesce(on_cost_percent,0)
    into rate, unit, oncost
    from public.resources where id = new.resource_id;
  if rate is null or new.booking_kind = 'leave' then
    new.cost_pence := 0; return new;
  end if;
  hrs := extract(epoch from (new.ends_at - new.starts_at)) / 3600.0;
  if unit = 'hour' then
    base := rate * hrs;
  elsif unit = 'annual' then
    base := (rate / 232.0) * (hrs / 8.0);
  else
    base := rate * (hrs / 8.0);
  end if;
  new.cost_pence := round(base * (1 + oncost / 100.0));
  return new;
end $$;

revoke execute on function public.compute_assignment_cost() from anon, authenticated, public;

create table if not exists public.resource_documents (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  resource_id  uuid not null references public.resources(id) on delete cascade,
  doc_type     text not null,
  reference    text,
  issued_on    date,
  expires_on   date,
  file_path    text,
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists resource_documents_resource_idx
  on public.resource_documents(tenant_id, resource_id);
create index if not exists resource_documents_expiry_idx
  on public.resource_documents(tenant_id, expires_on);

drop trigger if exists resource_documents_touch on public.resource_documents;
create trigger resource_documents_touch
  before update on public.resource_documents
  for each row execute procedure public.touch_updated_at();

create or replace function public.assert_resource_doc_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare parent_tenant uuid;
begin
  select tenant_id into parent_tenant from public.resources where id = new.resource_id;
  if parent_tenant is null then
    raise exception 'assert_resource_doc_tenant: parent resource not found';
  end if;
  if new.tenant_id is null then new.tenant_id := parent_tenant;
  elsif new.tenant_id <> parent_tenant then
    raise exception 'tenant_id mismatch on resource_documents' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists resource_documents_tenant_match on public.resource_documents;
create trigger resource_documents_tenant_match
  before insert or update on public.resource_documents
  for each row execute procedure public.assert_resource_doc_tenant();

revoke execute on function public.assert_resource_doc_tenant() from anon, authenticated, public;

alter table public.resource_documents enable row level security;

drop policy if exists resource_documents_read on public.resource_documents;
create policy resource_documents_read on public.resource_documents
  for select using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm'))
    or exists (select 1 from public.resources r
               where r.id = resource_id and r.user_id = auth.uid())
  );

drop policy if exists resource_documents_write on public.resource_documents;
create policy resource_documents_write on public.resource_documents
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(tenant_id)
        and public.current_user_role() in ('owner','pm'))
  ) with check (tenant_id = public.current_user_tenant_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resource-docs','resource-docs', false, 20971520,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "resource_docs_read" on storage.objects;
create policy "resource_docs_read" on storage.objects for select using (
  bucket_id = 'resource-docs'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (public.is_platform_admin() or public.current_user_role() in ('owner','pm'))
);

drop policy if exists "resource_docs_write" on storage.objects;
create policy "resource_docs_write" on storage.objects for insert with check (
  bucket_id = 'resource-docs'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (public.is_platform_admin() or public.current_user_role() in ('owner','pm'))
);

drop policy if exists "resource_docs_delete" on storage.objects;
create policy "resource_docs_delete" on storage.objects for delete using (
  bucket_id = 'resource-docs'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and (public.is_platform_admin() or public.current_user_role() in ('owner','pm'))
);
