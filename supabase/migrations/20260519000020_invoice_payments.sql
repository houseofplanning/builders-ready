-- Payable invoices via Stripe Connect.
--
-- A client pays a (milestone or standalone) invoice through a Stripe Checkout
-- session created ON the builder's connected account (direct charge), with a
-- flat platform application fee. These columns record the Stripe linkage and
-- how it was paid. The status flip to 'paid' is done by the reconciliation
-- webhook (service role), never by the client.

alter table public.invoices
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists platform_fee_pence bigint,
  add column if not exists paid_via text
    check (paid_via is null or paid_via in ('card', 'bank', 'manual'));

create index if not exists invoices_checkout_session_idx
  on public.invoices(stripe_checkout_session_id);

comment on column public.invoices.stripe_checkout_session_id is
  'Stripe Checkout Session id for the most recent pay attempt (cs_...).';
comment on column public.invoices.stripe_payment_intent_id is
  'Stripe PaymentIntent id once paid (pi_...), on the connected account.';
comment on column public.invoices.platform_fee_pence is
  'Flat platform application fee applied to this payment, in pence.';
comment on column public.invoices.paid_via is
  'How the invoice was settled: card, bank (Pay by Bank), or manual (offline).';
