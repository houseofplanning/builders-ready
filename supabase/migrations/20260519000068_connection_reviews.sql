-- Builder <-> sub reviews: leave one review per direction per shared project.
-- Also adds the hiring builder's tenant id to my_schedule so a hired
-- tradesperson can rate the right builder.

drop function if exists public.my_schedule();
create function public.my_schedule()
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
  business_tenant_id uuid,
  business_name   text,
  business_phone  text,
  pm_name         text,
  pm_phone        text
)
language sql stable security definer set search_path = public as $$
  select
    a.id, a.starts_at, a.ends_at, a.booking_kind::text, a.status::text, a.note,
    p.id, p.name, p.address_line1, p.address_line2, p.city, p.postcode,
    s.name, t.id, t.name, t.business_phone, pm.full_name, pm.phone
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
grant execute on function public.my_schedule() to authenticated;

create or replace function public.leave_connection_review(
  p_project_id uuid,
  p_counterparty_tenant uuid,
  p_direction text,
  p_rating int,
  p_body text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_my_tenant uuid := public.current_user_tenant_id();
  v_review_tenant uuid;
  v_reviewee uuid;
  v_ok boolean := false;
begin
  if v_me is null then raise exception 'Not signed in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1 to 5'; end if;

  if p_direction = 'builder_to_sub' then
    select exists(
      select 1 from public.projects pr
      join public.resources r on r.tenant_id = pr.tenant_id and r.marketplace_tenant_id = p_counterparty_tenant
      join public.assignments a on a.project_id = pr.id and a.resource_id = r.id
      where pr.id = p_project_id and pr.tenant_id = v_my_tenant
    ) into v_ok;
    v_review_tenant := v_my_tenant;
    select owner_user_id into v_reviewee from public.tenants where id = p_counterparty_tenant;
  elsif p_direction = 'sub_to_builder' then
    select exists(
      select 1 from public.projects pr
      join public.resources r on r.tenant_id = pr.tenant_id and r.marketplace_tenant_id = v_my_tenant
      join public.assignments a on a.project_id = pr.id and a.resource_id = r.id
      where pr.id = p_project_id and pr.tenant_id = p_counterparty_tenant
    ) into v_ok;
    v_review_tenant := p_counterparty_tenant;
    select owner_user_id into v_reviewee from public.tenants where id = p_counterparty_tenant;
  else
    raise exception 'Unknown review direction';
  end if;

  if not v_ok then raise exception 'No shared job found to review'; end if;
  if v_reviewee is null then raise exception 'Counterparty not found'; end if;

  if exists (
    select 1 from public.marketplace_reviews
    where project_id = p_project_id and reviewer_id = v_me and direction = p_direction::public.review_direction
  ) then
    raise exception 'You have already reviewed this job';
  end if;

  insert into public.marketplace_reviews (project_id, tenant_id, reviewer_id, reviewee_id, direction, rating, body)
  values (p_project_id, v_review_tenant, v_me, v_reviewee, p_direction::public.review_direction, p_rating, nullif(trim(p_body), ''));
end $$;

grant execute on function public.leave_connection_review(uuid, uuid, text, int, text) to authenticated;
