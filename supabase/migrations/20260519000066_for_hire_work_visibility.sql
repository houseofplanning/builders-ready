-- Extend the "my work" surface and booking notifications to the tenant bridge:
-- a PAID tradesman is hired via resources.marketplace_tenant_id, so their own
-- tenant's owner/PMs must see and be notified of those jobs (their For Hire
-- side), exactly as an operative sees jobs via resources.user_id.

create or replace function public.my_schedule()
returns table(
  assignment_id   uuid,
  starts_at       timestamptz,
  ends_at         timestamptz,
  booking_kind    text,
  status          text,
  note            text,
  project_id      uuid,
  project_name    text,
  address_line1   text,
  address_line2   text,
  city            text,
  postcode        text,
  stage_name      text,
  business_name   text,
  business_phone  text,
  pm_name         text,
  pm_phone        text
)
language sql stable security definer set search_path = public as $$
  select
    a.id, a.starts_at, a.ends_at, a.booking_kind::text, a.status::text, a.note,
    p.id, p.name, p.address_line1, p.address_line2, p.city, p.postcode,
    s.name, t.name, t.business_phone, pm.full_name, pm.phone
  from public.assignments a
  join public.resources r on r.id = a.resource_id
    and (r.user_id = auth.uid()
         or r.marketplace_tenant_id = public.current_user_tenant_id())
  join public.projects p on p.id = a.project_id
  left join public.project_stages s on s.id = a.stage_id
  join public.tenants t on t.id = a.tenant_id
  left join public.profiles pm on pm.id = p.pm_id
  where a.ends_at >= (now() - interval '1 day')
  order by a.starts_at;
$$;

create or replace function public.confirm_my_assignment(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  update public.assignments a
    set status = 'confirmed', updated_at = now()
    from public.resources r
    where a.id = p_id
      and a.resource_id = r.id
      and (r.user_id = auth.uid()
           or r.marketplace_tenant_id = public.current_user_tenant_id())
      and a.status in ('planned', 'confirmed');
  if not found then
    raise exception 'That booking is not yours, or cannot be confirmed';
  end if;
end $$;

create or replace function public.notify_resource_booked(p_resource_id uuid, p_project_id uuid)
returns table(recipient_email text, recipient_name text, business_name text, project_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_mkt_tenant_id uuid;
  v_status public.connection_status;
  v_business text;
  v_project text;
  v_recipient uuid;
begin
  select r.tenant_id, r.user_id, r.marketplace_tenant_id, r.connection_status, t.name
    into v_tenant_id, v_user_id, v_mkt_tenant_id, v_status, v_business
  from public.resources r
  join public.tenants t on t.id = r.tenant_id
  where r.id = p_resource_id;

  if v_tenant_id is null then
    raise exception 'Resource not found';
  end if;

  if not (
    public.is_platform_admin()
    or (v_tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm'))
  ) then
    raise exception 'Not allowed';
  end if;

  if v_status <> 'connected' then
    return;
  end if;

  if v_user_id is not null then
    v_recipient := v_user_id;
  elsif v_mkt_tenant_id is not null then
    select owner_user_id into v_recipient from public.tenants where id = v_mkt_tenant_id;
  end if;
  if v_recipient is null then
    return;
  end if;

  select name into v_project from public.projects where id = p_project_id;

  perform public.send_push(
    recipient_id := v_recipient,
    t_id         := v_tenant_id,
    proj_id      := p_project_id,
    kind         := 'assignment_booked',
    title        := 'You' || chr(39) || 've been booked on a job',
    body         := coalesce(v_business, 'A builder') || ' booked you on ' || coalesce(v_project, 'a job'),
    payload      := jsonb_build_object('project_id', p_project_id)
  );

  return query
    select p.email, p.full_name, v_business, v_project
    from public.profiles p where p.id = v_recipient;
end $$;
