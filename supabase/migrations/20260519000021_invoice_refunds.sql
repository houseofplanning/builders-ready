-- Invoice refunds (Stripe Connect Phase 4 polish).
--
-- Adds a 'refunded' invoice status plus columns tracking the Stripe refund.
-- A refund is initiated by the builder (owner/PM) or in the Stripe dashboard;
-- either way the charge.refunded webhook keeps the invoice in sync.

alter type public.invoice_status add value if not exists 'refunded';

alter table public.invoices
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reference text,
  add column if not exists refunded_amount_pence bigint;

comment on column public.invoices.refund_reference is
  'Stripe Refund id (re_...) on the connected account.';
comment on column public.invoices.refunded_amount_pence is
  'Amount refunded to the client, in pence.';
