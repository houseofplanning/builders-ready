-- Resource connections: turn a typed-in contact (a `resources` row) into a
-- two-way connected person who can see their jobs and respond.
--
-- Model (see docs/CONNECTIONS-MARKETPLACE-SPEC.md), built on what already
-- exists — NOT a new identity system:
--   * A connected PAID tradesman is a tenant: link via resources.marketplace_tenant_id.
--   * A connected FREE operative is an auth user: link via resources.user_id.
-- Both bridge columns already exist on `resources`. This migration adds:
--   * connection_status on resources (explicit state).
--   * resource_invites (the Door A invite bridge, email at launch).
--   * accept/preview RPCs (SECURITY DEFINER) so an invitee who is NOT an
--     owner/pm of the inviting tenant can read their invite and accept it.
--   * a self-read policy so a connected person can read their own resource row.
--
-- No existing marketplace table is touched here. Money/rates unchanged.

-- 1. Connection state -------------------------------------------------------
do $$ begin
  create type public.connection_status as enum
    ('contact_only','invited','connected','disconnected');
exception when duplicate_object then null; end $$;

alter table public.resources
  add column if not exists connection_status public.connection_status
  not null default 'contact_only';

-- Backfill: anything already linked to a login or another tenant is connected.
update public.resources
  set connection_status = 'connected'
  where connection_status = 'contact_only'
    and (user_id is not null or marketplace_tenant_id is not null);

-- 2. Invite bridge ----------------------------------------------------------
create table if not exists public.resource_invites (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  resource_id      uuid not null references public.resources(id) on delete cascade,
  channel          text not null default 'email' check (channel in ('email','sms')),
  sent_to          text not null,
  token            text not null unique default encode(gen_random_bytes(16),'hex'),
  status           text not null default 'pending'
                     check (status in ('pending','accepted','declined','expired')),
  invited_by       uuid references auth.users(id),
  accepted_user_id uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  responded_at     timestamptz
);

create index if not exists resource_invites_resource_idx on public.resource_invites(resource_id);
create index if not exists resource_invites_tenant_idx on public.resource_invites(tenant_id);
create unique index if not exists resource_invites_one_pending
  on public.resource_invites(resource_id) where status = 'pending';

alter table public.resource_invites enable row level security;

-- Only the inviting tenant's owner/PM manage invites. Invitees never read the
-- table directly — they go through the SECURITY DEFINER RPCs below.
drop policy if exists resource_invites_rw on public.resource_invites;
create policy resource_invites_rw on public.resource_invites
  for all using (
    public.is_platform_admin()
    or (tenant_id = public.current_user_tenant_id()
        and public.current_user_role() in ('owner','pm'))
  ) with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','pm')
  );

-- 3. Self-read: a connected person can read their own resource row(s) -------
drop policy if exists resources_self_read on public.resources;
create policy resources_self_read on public.resources
  for select using (user_id = auth.uid());

-- 4. Invite preview (anon-safe): who invited me, before I sign up -----------
create or replace function public.get_resource_invite(p_token text)
returns table(tenant_name text, resource_name text, invite_status text, sent_to text)
language sql stable security definer set search_path = public as $$
  select t.name, r.display_name, ri.status, ri.sent_to
  from public.resource_invites ri
  join public.resources r on r.id = ri.resource_id
  join public.tenants  t on t.id = ri.tenant_id
  where ri.token = p_token;
$$;

-- 5. Accept an invite: link my login to the resource and mark connected -----
create or replace function public.accept_resource_invite(p_token text)
returns table(resource_id uuid, tenant_id uuid, tenant_slug text)
language plpgsql security definer set search_path = public as $$
declare v_inv public.resource_invites;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to accept an invite';
  end if;

  select * into v_inv from public.resource_invites
    where token = p_token and status = 'pending'
    for update;
  if not found then
    raise exception 'Invite not found or already used';
  end if;

  update public.resources
    set user_id = auth.uid(),
        connection_status = 'connected',
        updated_at = now()
    where id = v_inv.resource_id;

  update public.resource_invites
    set status = 'accepted', responded_at = now(), accepted_user_id = auth.uid()
    where id = v_inv.id;

  return query
    select r.id, r.tenant_id, t.slug::text
    from public.resources r
    join public.tenants t on t.id = r.tenant_id
    where r.id = v_inv.resource_id;
end $$;

grant execute on function public.get_resource_invite(text) to anon, authenticated;
grant execute on function public.accept_resource_invite(text) to authenticated;
