-- =========================================================================
-- Builders Ready — Migration 3/9: profiles + RLS helper functions
-- =========================================================================
-- Profiles are 1:1 with auth.users. Role is NOT here — it lives on
-- tenant_members so it's scoped to membership, not the user globally.
-- =========================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null,
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

-- Auto-create a profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------------------
-- RLS helpers — all security definer + explicit search_path
-- -------------------------------------------------------------------------

-- The calling user's tenant_id, or null if not a member of any tenant.
create or replace function public.current_user_tenant_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_members where user_id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.tenant_member_role
language sql stable security definer set search_path = public as $$
  select role from public.tenant_members where user_id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_active(t_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenants
    where id = t_id
      and status = 'active'
      and (
        subscription_status in ('trialing','active','past_due')
        or subscription_status is null
      )
  );
$$;

-- has_project_access — tenant-scoped. The caller must belong to the
-- project's tenant AND be either the client, the pm, or the tenant owner.
-- Platform admins bypass.
--
-- NOTE: declared `language plpgsql` (not `language sql`) so the body's
-- reference to public.projects is resolved at first call, not at CREATE
-- time. The projects table is created in migration 4 — this lets
-- migration 3 succeed before that table exists.
create or replace function public.has_project_access(p uuid)
returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return public.is_platform_admin()
    or exists (
      select 1
      from public.projects pr
      where pr.id = p
        and pr.tenant_id = public.current_user_tenant_id()
        and public.is_tenant_active(pr.tenant_id)
        and (
          pr.client_id = auth.uid()
          or pr.pm_id  = auth.uid()
          or public.current_user_role() = 'owner'
        )
    );
end $$;
