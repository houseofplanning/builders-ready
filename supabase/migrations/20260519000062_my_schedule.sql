-- "My Week" for a connected person (operative/subcontractor) on mobile.
--
-- A connected person is NOT a tenant member, so they must not get row access
-- to `projects` (which holds quoted_amount_pence and other private data).
-- Instead this SECURITY DEFINER function returns ONLY the limited context the
-- spec allows: their own bookings, the job name + address, the stage, the
-- business name/phone and a PM contact. No money, no other resources.

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
    s.name, t.name, t.business_phone,
    pm.full_name, pm.phone
  from public.assignments a
  join public.resources r on r.id = a.resource_id and r.user_id = auth.uid()
  join public.projects p on p.id = a.project_id
  left join public.project_stages s on s.id = a.stage_id
  join public.tenants t on t.id = a.tenant_id
  left join public.profiles pm on pm.id = p.pm_id
  where a.ends_at >= (now() - interval '1 day')
  order by a.starts_at;
$$;

-- Confirm one of my own bookings (planned -> confirmed). The builder sees the
-- confirmed status in their schedule. Decline + notifications come next slice.
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
      and r.user_id = auth.uid()
      and a.status in ('planned', 'confirmed');
  if not found then
    raise exception 'That booking is not yours, or cannot be confirmed';
  end if;
end $$;

grant execute on function public.my_schedule() to authenticated;
grant execute on function public.confirm_my_assignment(uuid) to authenticated;
