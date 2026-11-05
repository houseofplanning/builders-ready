-- Direct chat between a hiring builder and a tradesperson (two tenants).
-- One thread per (builder, sub) pair. Separate from marketplace_threads.

create table if not exists public.connection_threads (
  id                uuid primary key default gen_random_uuid(),
  builder_tenant_id uuid not null references public.tenants(id) on delete cascade,
  sub_tenant_id     uuid not null references public.tenants(id) on delete cascade,
  created_at        timestamptz not null default now(),
  last_message_at   timestamptz not null default now(),
  unique (builder_tenant_id, sub_tenant_id)
);

create table if not exists public.connection_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.connection_threads(id) on delete cascade,
  sender_id   uuid not null references auth.users(id),
  body        text,
  image_url   text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists connection_threads_builder_idx on public.connection_threads(builder_tenant_id);
create index if not exists connection_threads_sub_idx on public.connection_threads(sub_tenant_id);
create index if not exists connection_messages_thread_idx on public.connection_messages(thread_id, created_at);

alter table public.connection_threads enable row level security;
alter table public.connection_messages enable row level security;

drop policy if exists connection_threads_rw on public.connection_threads;
create policy connection_threads_rw on public.connection_threads
  for all using (
    public.is_platform_admin()
    or builder_tenant_id = public.current_user_tenant_id()
    or sub_tenant_id = public.current_user_tenant_id()
  ) with check (
    builder_tenant_id = public.current_user_tenant_id()
    or sub_tenant_id = public.current_user_tenant_id()
  );

drop policy if exists connection_messages_rw on public.connection_messages;
create policy connection_messages_rw on public.connection_messages
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.connection_threads t
      where t.id = thread_id
        and (t.builder_tenant_id = public.current_user_tenant_id()
             or t.sub_tenant_id = public.current_user_tenant_id())
    )
  ) with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connection_threads t
      where t.id = thread_id
        and (t.builder_tenant_id = public.current_user_tenant_id()
             or t.sub_tenant_id = public.current_user_tenant_id())
    )
  );

create or replace function public.open_connection_thread(p_builder_tenant uuid, p_sub_tenant uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_me uuid := public.current_user_tenant_id();
begin
  if v_me is null or v_me not in (p_builder_tenant, p_sub_tenant) then
    raise exception 'Not allowed';
  end if;
  insert into public.connection_threads (builder_tenant_id, sub_tenant_id)
  values (p_builder_tenant, p_sub_tenant)
  on conflict (builder_tenant_id, sub_tenant_id) do update set builder_tenant_id = excluded.builder_tenant_id
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.open_connection_thread(uuid, uuid) to authenticated;

create or replace function public.on_connection_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_builder uuid; v_sub uuid;
  v_recipient_tenant uuid; v_recipient uuid; v_sender_tenant uuid; v_sender_name text;
begin
  select builder_tenant_id, sub_tenant_id into v_builder, v_sub
  from public.connection_threads where id = new.thread_id;

  update public.connection_threads set last_message_at = new.created_at where id = new.thread_id;

  if exists (select 1 from public.tenant_members where tenant_id = v_builder and user_id = new.sender_id) then
    v_sender_tenant := v_builder; v_recipient_tenant := v_sub;
  else
    v_sender_tenant := v_sub; v_recipient_tenant := v_builder;
  end if;

  select owner_user_id into v_recipient from public.tenants where id = v_recipient_tenant;
  select name into v_sender_name from public.tenants where id = v_sender_tenant;
  if v_recipient is null then return new; end if;

  perform public.send_push(
    recipient_id := v_recipient,
    t_id         := v_recipient_tenant,
    proj_id      := null,
    kind         := 'message_received',
    title        := coalesce(v_sender_name, 'A builder') || ' messaged you',
    body         := left(coalesce(new.body, 'Sent a photo'), 120),
    payload      := jsonb_build_object('conn_thread_id', new.thread_id)
  );
  return new;
end $$;

drop trigger if exists connection_messages_notify on public.connection_messages;
create trigger connection_messages_notify
  after insert on public.connection_messages
  for each row execute function public.on_connection_message();
