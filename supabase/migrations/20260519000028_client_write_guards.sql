-- High-logic hardening (audit 2026-10-10):
--
-- L1  Marketplace-customer lockouts: contracts_client_sign and reports_client_ack
--     gated USING on tenant_id = current_user_tenant_id(), which is NULL for a
--     marketplace customer (no tenant_members row) — so they silently could not
--     sign their contract or acknowledge a report. Mirror migration 27
--     (decisions/variations): require only that the caller is the project's
--     client. Invoices are intentionally NOT opened here — a customer's cash
--     request goes through the request_cash_payment RPC, not a direct update.
--
-- L2  Column-write guards: RLS cannot restrict *which columns* an UPDATE touches,
--     so a client/customer/trade with a legitimate row-level UPDATE grant could
--     edit money/status fields they shouldn't (invoice amount, bid amount,
--     contract sum, variation delta, etc.) via a hand-crafted API call. These
--     BEFORE UPDATE triggers force every column except the ones that action
--     legitimately changes back to its old value. Owner/PM and service-role
--     (acceptBid, Stripe) writes pass through untouched.
--
-- L3  job_requests address/geo read exposure is deferred: those columns are
--     currently unpopulated (the post-a-job flow collects only city/postcode)
--     and the real fix needs app changes (repoint the detail screens at the
--     PII-safe open_jobs_feed), not an RLS/trigger change. Tracked separately.

-- ---------------------------------------------------------------------------
-- L1 — open contract signing + report acknowledgement to marketplace customers
-- ---------------------------------------------------------------------------
drop policy if exists contracts_client_sign on public.contracts;
create policy contracts_client_sign on public.contracts
  for update using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (signed_by = auth.uid());

drop policy if exists reports_client_ack on public.reports;
create policy reports_client_ack on public.reports
  for update using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and pr.client_id = auth.uid()
    )
  ) with check (acknowledged_by = auth.uid());

-- ---------------------------------------------------------------------------
-- L2 — column-write guards
-- ---------------------------------------------------------------------------

-- True when the caller is the project's client acting as a client (not an
-- owner/PM of the tenant, and not the service role). SECURITY DEFINER so it can
-- read projects.client_id regardless of the caller's RLS.
create or replace function public.acting_as_client(p_project uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and auth.uid() = (select client_id from public.projects where id = p_project)
     and coalesce(public.current_user_role()::text, '') not in ('owner', 'pm');
$$;
revoke execute on function public.acting_as_client(uuid) from public, anon, authenticated;

-- invoices: a client may only mark paid (status->'paid', paid_at, paid_reference,
-- paid_marked_by). Everything else — amount, number, dates, Stripe refs, fees,
-- paid_via, refunds, cash_requested_at — is held to its old value.
create or replace function public.guard_client_invoice_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.acting_as_client(NEW.project_id) then
    if NEW.status is distinct from OLD.status and NEW.status::text <> 'paid' then
      NEW.status := OLD.status;
    end if;
    NEW.tenant_id := OLD.tenant_id;
    NEW.project_id := OLD.project_id;
    NEW.created_by := OLD.created_by;
    NEW.number := OLD.number;
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.amount_gbp_pence := OLD.amount_gbp_pence;
    NEW.issued_at := OLD.issued_at;
    NEW.due_at := OLD.due_at;
    NEW.stripe_checkout_session_id := OLD.stripe_checkout_session_id;
    NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
    NEW.platform_fee_pence := OLD.platform_fee_pence;
    NEW.paid_via := OLD.paid_via;
    NEW.refunded_at := OLD.refunded_at;
    NEW.refund_reference := OLD.refund_reference;
    NEW.refunded_amount_pence := OLD.refunded_amount_pence;
    NEW.cash_requested_at := OLD.cash_requested_at;
    NEW.created_at := OLD.created_at;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_guard_client_invoice_update on public.invoices;
create trigger trg_guard_client_invoice_update
  before update on public.invoices
  for each row execute function public.guard_client_invoice_update();

-- contracts: a client may only sign (status->'signed', client_signature,
-- signed_at, signed_by). Contract sum / terms / retention held fixed.
create or replace function public.guard_client_contract_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.acting_as_client(NEW.project_id) then
    if NEW.status is distinct from OLD.status and NEW.status::text <> 'signed' then
      NEW.status := OLD.status;
    end if;
    NEW.tenant_id := OLD.tenant_id;
    NEW.project_id := OLD.project_id;
    NEW.created_by := OLD.created_by;
    NEW.contract_sum_pence := OLD.contract_sum_pence;
    NEW.terms := OLD.terms;
    NEW.retention_percent := OLD.retention_percent;
    NEW.sent_at := OLD.sent_at;
    NEW.created_at := OLD.created_at;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_guard_client_contract_update on public.contracts;
create trigger trg_guard_client_contract_update
  before update on public.contracts
  for each row execute function public.guard_client_contract_update();

-- reports: a client may only acknowledge (acknowledged_at, acknowledged_by).
create or replace function public.guard_client_report_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.acting_as_client(NEW.project_id) then
    NEW.tenant_id := OLD.tenant_id;
    NEW.project_id := OLD.project_id;
    NEW.posted_by := OLD.posted_by;
    NEW.title := OLD.title;
    NEW.kind := OLD.kind;
    NEW.pdf_storage_path := OLD.pdf_storage_path;
    NEW.summary := OLD.summary;
    NEW.next_week := OLD.next_week;
    NEW.risks := OLD.risks;
    NEW.decisions_needed := OLD.decisions_needed;
    NEW.posted_at := OLD.posted_at;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_guard_client_report_update on public.reports;
create trigger trg_guard_client_report_update
  before update on public.reports
  for each row execute function public.guard_client_report_update();

-- variations: a client may only decide (status, client_signature, decided_at,
-- decided_by). The delta amount / days / title / description are held fixed.
create or replace function public.guard_client_variation_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.acting_as_client(NEW.project_id) then
    NEW.tenant_id := OLD.tenant_id;
    NEW.project_id := OLD.project_id;
    NEW.proposed_by := OLD.proposed_by;
    NEW.number := OLD.number;
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.delta_amount_gbp_pence := OLD.delta_amount_gbp_pence;
    NEW.delta_days := OLD.delta_days;
    NEW.created_at := OLD.created_at;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_guard_client_variation_update on public.variations;
create trigger trg_guard_client_variation_update
  before update on public.variations
  for each row execute function public.guard_client_variation_update();

-- decisions: a client may only decide (status, selected_option_id, decided_at,
-- decided_by). Title / description / deadline held fixed.
create or replace function public.guard_client_decision_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.acting_as_client(NEW.project_id) then
    NEW.tenant_id := OLD.tenant_id;
    NEW.project_id := OLD.project_id;
    NEW.raised_by := OLD.raised_by;
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.deadline := OLD.deadline;
    NEW.created_at := OLD.created_at;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_guard_client_decision_update on public.decisions;
create trigger trg_guard_client_decision_update
  before update on public.decisions
  for each row execute function public.guard_client_decision_update();

-- bids: the customer may only decline their job's bids; the trade may only
-- withdraw its own bid or attach a quote (estimate_id). Amount / message / who /
-- which-job are held fixed. status='accepted'/'matched' is done by the
-- acceptBid service-role path (auth.uid() is null) and passes through.
create or replace function public.guard_bid_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_customer uuid; v_my_tenant uuid;
begin
  if auth.uid() is null then
    return NEW;  -- service role (acceptBid / admin)
  end if;
  v_customer := public.mp_job_customer(OLD.job_request_id);
  v_my_tenant := public.current_user_tenant_id();

  if auth.uid() = v_customer then
    -- customer: decline only
    if NEW.status is distinct from OLD.status and NEW.status::text <> 'declined' then
      NEW.status := OLD.status;
    end if;
    NEW.amount_pence := OLD.amount_pence;
    NEW.message := OLD.message;
    NEW.estimate_id := OLD.estimate_id;
    NEW.tenant_id := OLD.tenant_id;
    NEW.created_by := OLD.created_by;
    NEW.job_request_id := OLD.job_request_id;
    NEW.available_from := OLD.available_from;
    NEW.duration_estimate := OLD.duration_estimate;
    NEW.warranty := OLD.warranty;
    NEW.about := OLD.about;
    NEW.created_at := OLD.created_at;
  elsif v_my_tenant is not null and OLD.tenant_id = v_my_tenant then
    -- trade (owns the bid's tenant): withdraw or attach a quote
    if NEW.status is distinct from OLD.status and NEW.status::text <> 'withdrawn' then
      NEW.status := OLD.status;
    end if;
    NEW.amount_pence := OLD.amount_pence;
    NEW.message := OLD.message;
    NEW.tenant_id := OLD.tenant_id;
    NEW.created_by := OLD.created_by;
    NEW.job_request_id := OLD.job_request_id;
    NEW.available_from := OLD.available_from;
    NEW.duration_estimate := OLD.duration_estimate;
    NEW.warranty := OLD.warranty;
    NEW.about := OLD.about;
    NEW.created_at := OLD.created_at;
    -- estimate_id intentionally left editable (createQuoteForBid)
  end if;
  return NEW;
end $$;
drop trigger if exists trg_guard_bid_update on public.bids;
create trigger trg_guard_bid_update
  before update on public.bids
  for each row execute function public.guard_bid_update();
