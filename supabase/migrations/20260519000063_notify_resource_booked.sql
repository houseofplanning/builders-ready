-- Notify a connected person when a builder books them onto a job.
--
-- Bookings are created one row per weekday, so a per-row trigger would fire a
-- push per day. Instead the booking action calls this function ONCE per
-- booking. It reuses send_push (migration 7): one in-app notification + one
-- Expo push. Email is sent separately by the web booking action (Resend).
--
-- NOTE: `alter type ... add value 'assignment_booked'` is applied as its own
-- migration before this one so the new enum value is committed first.

create or replace function public.notify_resource_booked(p_resource_id uuid, p_project_id uuid)
returns table(recipient_email text, recipient_name text, business_name text, project_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_status public.connection_status;
  v_business text;
  v_project text;
begin
  select r.tenant_id, r.user_id, r.connection_status, t.name
    into v_tenant_id, v_user_id, v_status, v_business
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

  if v_user_id is null or v_status <> 'connected' then
    return;
  end if;

  select name into v_project from public.projects where id = p_project_id;

  perform public.send_push(
    recipient_id := v_user_id,
    t_id         := v_tenant_id,
    proj_id      := p_project_id,
    kind         := 'assignment_booked',
    title        := 'You' || chr(39) || 've been booked on a job',
    body         := coalesce(v_business, 'A builder') || ' booked you on ' || coalesce(v_project, 'a job'),
    payload      := jsonb_build_object('project_id', p_project_id)
  );

  return query
    select p.email, p.full_name, v_business, v_project
    from public.profiles p where p.id = v_user_id;
end $$;

grant execute on function public.notify_resource_booked(uuid, uuid) to authenticated;
