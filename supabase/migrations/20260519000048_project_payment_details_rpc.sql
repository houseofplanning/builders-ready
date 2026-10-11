-- Builder payment readiness + bank details for a project, readable only by
-- someone with access to that project (the client, PM, or owner). Lets the
-- mobile/web client see how to pay without reading the tenants table directly.
create or replace function public.project_payment_details(p_project uuid)
returns table (
  card_ready          boolean,
  bank_ready          boolean,
  bank_name           text,
  bank_account_name   text,
  bank_sort_code      text,
  bank_account_number text
)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_tenant uuid;
begin
  select tenant_id into v_tenant from public.projects where id = p_project;
  if v_tenant is null then return; end if;
  if not public.has_project_access(p_project) then
    raise exception 'Not authorised';
  end if;
  return query
  select
    coalesce(t.connect_charges_enabled, false),
    (t.bank_account_number is not null and t.bank_sort_code is not null),
    t.bank_name, t.bank_account_name, t.bank_sort_code, t.bank_account_number
  from public.tenants t
  where t.id = v_tenant;
end $$;

revoke all on function public.project_payment_details(uuid) from public, anon;
grant execute on function public.project_payment_details(uuid) to authenticated;
