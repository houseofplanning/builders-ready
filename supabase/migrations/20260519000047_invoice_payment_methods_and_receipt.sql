-- =========================================================================
-- Migration 47: per-invoice payment methods, bank-transfer flag, receipt
-- =========================================================================
-- 1. Per-invoice toggles for which methods the builder offers the client.
--    Default all on; the UI additionally hides card unless Stripe is
--    connected and bank unless bank details are saved.
alter table public.invoices
  add column if not exists allow_card          boolean not null default true,
  add column if not exists allow_bank_transfer boolean not null default true,
  add column if not exists allow_cash          boolean not null default true,
  add column if not exists bank_requested_at   timestamptz;

-- 2. Client flags "I've paid by bank transfer" (mirrors request_cash_payment).
--    SECURITY DEFINER so it bypasses the client-update guard; only the
--    project's client may flag, and only while the invoice is sent/overdue.
create or replace function public.request_bank_payment(p_invoice uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_client uuid;
begin
  select pr.client_id into v_client
  from public.invoices i join public.projects pr on pr.id = i.project_id
  where i.id = p_invoice;
  if v_client is distinct from auth.uid() then
    raise exception 'Not your invoice';
  end if;
  update public.invoices set bank_requested_at = now()
  where id = p_invoice and status in ('sent', 'overdue');
end $$;

revoke all on function public.request_bank_payment(uuid) from public, anon;
grant execute on function public.request_bank_payment(uuid) to authenticated;

-- 3. Payment-received receipt: whenever an invoice flips to paid (by card
--    webhook, or a builder confirming cash / bank transfer / manual), send
--    the client an in-app + push "Payment received" receipt.
create or replace function public.on_invoice_paid()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_client uuid;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select client_id into v_client from public.projects where id = new.project_id;
    if v_client is not null then
      perform public.send_push(
        recipient_id := v_client,
        t_id         := new.tenant_id,
        proj_id      := new.project_id,
        kind         := 'invoice_paid',
        title        := 'Payment received',
        body         := new.number || ' — ' || new.title || ' is marked paid. Thank you.',
        payload      := jsonb_build_object('invoice_id', new.id)
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists invoices_paid_receipt on public.invoices;
create trigger invoices_paid_receipt
  after update on public.invoices
  for each row execute function public.on_invoice_paid();
