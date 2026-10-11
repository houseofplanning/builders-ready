-- =========================================================================
-- Migration 50: make "pay in cash" actually stick + notify the builder
-- =========================================================================
-- The client-update guard reverted cash_requested_at on every client update,
-- so flagging cash never took (bank_transfer worked only because the guard
-- predates that column). Stop reverting the two client-settable intent flags.
create or replace function public.guard_client_invoice_update()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if public.acting_as_client(NEW.project_id) then
    if NEW.status is distinct from OLD.status and NEW.status::text <> 'paid' then NEW.status := OLD.status; end if;
    NEW.tenant_id := OLD.tenant_id; NEW.project_id := OLD.project_id; NEW.created_by := OLD.created_by;
    NEW.number := OLD.number; NEW.title := OLD.title; NEW.description := OLD.description;
    NEW.amount_gbp_pence := OLD.amount_gbp_pence; NEW.issued_at := OLD.issued_at; NEW.due_at := OLD.due_at;
    NEW.stripe_checkout_session_id := OLD.stripe_checkout_session_id; NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
    NEW.platform_fee_pence := OLD.platform_fee_pence; NEW.paid_via := OLD.paid_via;
    NEW.refunded_at := OLD.refunded_at; NEW.refund_reference := OLD.refund_reference; NEW.refunded_amount_pence := OLD.refunded_amount_pence;
    NEW.created_at := OLD.created_at;
    -- cash_requested_at / bank_requested_at intentionally NOT reverted — these
    -- are client "I'll pay by X" intent flags; the builder still confirms.
  end if;
  return NEW;
end $$;

-- Client flags cash; the flag sticks AND the builder (PM) is notified so they
-- can confirm receipt. A notify hiccup must never block the flag itself.
create or replace function public.request_cash_payment(p_invoice uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_client uuid; v_pm uuid; v_tenant uuid; v_project uuid; v_number text; v_name text;
begin
  select pr.client_id, pr.pm_id, i.tenant_id, pr.id, i.number
    into v_client, v_pm, v_tenant, v_project, v_number
  from public.invoices i join public.projects pr on pr.id = i.project_id
  where i.id = p_invoice;
  if v_client is distinct from auth.uid() then raise exception 'Not your invoice'; end if;
  update public.invoices set cash_requested_at = now()
  where id = p_invoice and status in ('sent', 'overdue');
  if v_pm is not null and exists (
    select 1 from public.invoices where id = p_invoice and cash_requested_at is not null
  ) then
    begin
      select full_name into v_name from public.profiles where id = v_client;
      perform public.send_push(v_pm, v_tenant, v_project, 'payment_flagged',
        'Payment flagged',
        coalesce(v_name, 'Your client') || ' will pay ' || v_number || ' in cash — confirm once received.',
        jsonb_build_object('invoice_id', p_invoice, 'method', 'cash'));
    exception when others then null;
    end;
  end if;
end $$;

-- Client flags bank transfer (mirror of the cash flow).
create or replace function public.request_bank_payment(p_invoice uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_client uuid; v_pm uuid; v_tenant uuid; v_project uuid; v_number text; v_name text;
begin
  select pr.client_id, pr.pm_id, i.tenant_id, pr.id, i.number
    into v_client, v_pm, v_tenant, v_project, v_number
  from public.invoices i join public.projects pr on pr.id = i.project_id
  where i.id = p_invoice;
  if v_client is distinct from auth.uid() then raise exception 'Not your invoice'; end if;
  update public.invoices set bank_requested_at = now()
  where id = p_invoice and status in ('sent', 'overdue');
  if v_pm is not null and exists (
    select 1 from public.invoices where id = p_invoice and bank_requested_at is not null
  ) then
    begin
      select full_name into v_name from public.profiles where id = v_client;
      perform public.send_push(v_pm, v_tenant, v_project, 'payment_flagged',
        'Payment flagged',
        coalesce(v_name, 'Your client') || ' says they''ve paid ' || v_number || ' by bank transfer — confirm once received.',
        jsonb_build_object('invoice_id', p_invoice, 'method', 'bank'));
    exception when others then null;
    end;
  end if;
end $$;

revoke all on function public.request_cash_payment(uuid) from public, anon;
grant execute on function public.request_cash_payment(uuid) to authenticated;
revoke all on function public.request_bank_payment(uuid) from public, anon;
grant execute on function public.request_bank_payment(uuid) to authenticated;
