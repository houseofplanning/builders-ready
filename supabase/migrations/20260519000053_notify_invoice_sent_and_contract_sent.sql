-- =========================================================================
-- Builders Ready — Migration 53: notify client on invoice raised + contract sent
-- =========================================================================
-- Gap found in testing: no client notification fired when a builder raised an
-- invoice (from web OR app) or sent a contract. Invoices/variations/decisions
-- already had notify triggers; invoices and contracts did not. These triggers
-- call public.send_push (migration 7), which inserts a `notifications` row AND
-- POSTs to Expo Push via pg_net — so one trigger covers both web and app.
-- =========================================================================

-- -------------------------------------------------------------------------
-- on_invoice_sent  →  notify the project's client when an invoice is raised
-- Fires on INSERT (status 'sent' is the default) and on UPDATE when the
-- status transitions into 'sent' (e.g. a draft being issued).
-- -------------------------------------------------------------------------
create or replace function public.on_invoice_sent()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
begin
  if new.status <> 'sent' then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  select client_id into recipient from public.projects where id = new.project_id;
  if recipient is null or recipient = new.created_by then return new; end if;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'invoice_sent',
    title        := 'New invoice · ' || new.number,
    body         := new.title || ' — £'
                    || to_char(round(new.amount_gbp_pence / 100.0, 2), 'FM999,999,990.00'),
    payload      := jsonb_build_object('invoice_id', new.id)
  );
  return new;
end $$;

drop trigger if exists invoices_sent_notify_ins on public.invoices;
create trigger invoices_sent_notify_ins
  after insert on public.invoices
  for each row execute procedure public.on_invoice_sent();

drop trigger if exists invoices_sent_notify_upd on public.invoices;
create trigger invoices_sent_notify_upd
  after update on public.invoices
  for each row execute procedure public.on_invoice_sent();

-- -------------------------------------------------------------------------
-- on_contract_sent  →  notify the project's client when a contract is sent
-- Fires on UPDATE into 'sent' (the normal path: draft → sent) and on INSERT
-- if a contract is created directly as 'sent'.
-- -------------------------------------------------------------------------
create or replace function public.on_contract_sent()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
begin
  if new.status <> 'sent' then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  select client_id into recipient from public.projects where id = new.project_id;
  if recipient is null or recipient = new.created_by then return new; end if;
  perform public.send_push(
    recipient_id := recipient,
    t_id         := new.tenant_id,
    proj_id      := new.project_id,
    kind         := 'contract_sent',
    title        := 'Contract ready to sign',
    body         := 'Your builder sent a contract for £'
                    || to_char(round(new.contract_sum_pence / 100.0, 2), 'FM999,999,990.00')
                    || ' — review and sign.',
    payload      := jsonb_build_object('contract_id', new.id)
  );
  return new;
end $$;

drop trigger if exists contracts_sent_notify_ins on public.contracts;
create trigger contracts_sent_notify_ins
  after insert on public.contracts
  for each row execute procedure public.on_contract_sent();

drop trigger if exists contracts_sent_notify_upd on public.contracts;
create trigger contracts_sent_notify_upd
  after update on public.contracts
  for each row execute procedure public.on_contract_sent();
