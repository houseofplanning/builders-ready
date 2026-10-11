-- =========================================================================
-- Builders Ready — Migration 45: editable project timeline (stages)
-- =========================================================================
-- Atomic full edit of a project's timeline — add / remove / reorder / rename /
-- re-date stages in one transaction, preserving each existing stage's status
-- and actual_end_date. Positions are bumped clear of the unique(project_id,
-- position) index first; a stage with updates posted against it (FK ON DELETE
-- RESTRICT) cannot be removed and the whole transaction rolls back with a clear
-- error. Owner/PM of an active tenant only (checked inside the SECURITY DEFINER
-- function); EXECUTE revoked from anon.
-- =========================================================================
create or replace function public.save_project_stages(p_project uuid, p_stages jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tenant uuid;
  v_elem   jsonb;
  v_i      int := 0;
begin
  select tenant_id into v_tenant from public.projects where id = p_project;
  if v_tenant is null then raise exception 'Project not found'; end if;
  if not (
    public.is_platform_admin()
    or (v_tenant = public.current_user_tenant_id()
        and public.is_tenant_active(v_tenant)
        and public.current_user_role() in ('owner','pm'))
  ) then
    raise exception 'Not authorised to edit this timeline';
  end if;
  if jsonb_typeof(p_stages) <> 'array' or jsonb_array_length(p_stages) = 0 then
    raise exception 'A project needs at least one stage';
  end if;

  update public.project_stages set position = position + 1000 where project_id = p_project;

  for v_elem in select * from jsonb_array_elements(p_stages) loop
    if (v_elem ? 'id') and coalesce(v_elem->>'id','') <> '' then
      update public.project_stages
        set name            = coalesce(nullif(v_elem->>'name',''), 'Stage'),
            start_date      = nullif(v_elem->>'start_date','')::date,
            target_end_date = nullif(v_elem->>'target_end_date','')::date,
            position        = v_i
        where id = (v_elem->>'id')::uuid and project_id = p_project;
    else
      insert into public.project_stages
        (tenant_id, project_id, position, name, start_date, target_end_date, status)
      values
        (v_tenant, p_project, v_i, coalesce(nullif(v_elem->>'name',''), 'Stage'),
         nullif(v_elem->>'start_date','')::date, nullif(v_elem->>'target_end_date','')::date,
         'not_started');
    end if;
    v_i := v_i + 1;
  end loop;

  if exists (
    select 1 from public.project_updates u
    join public.project_stages s on s.id = u.stage_id
    where s.project_id = p_project and s.position >= 1000
  ) then
    raise exception 'Cannot remove a stage that has updates posted against it — reassign or delete those updates first.';
  end if;
  delete from public.project_stages where project_id = p_project and position >= 1000;
end $$;

revoke all on function public.save_project_stages(uuid, jsonb) from public, anon;
grant execute on function public.save_project_stages(uuid, jsonb) to authenticated;
