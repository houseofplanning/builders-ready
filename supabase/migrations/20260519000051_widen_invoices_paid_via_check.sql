-- Builders confirm cash and bank-transfer payments; record those methods
-- accurately. The old constraint only allowed card/bank/manual, so confirming
-- a bank transfer (paid_via='bank_transfer') or cash (paid_via='cash') failed
-- with a check-constraint violation.
alter table public.invoices drop constraint if exists invoices_paid_via_check;
alter table public.invoices add constraint invoices_paid_via_check
  check (
    paid_via is null
    or paid_via = any (array['card','bank','bank_transfer','cash','manual'])
  );
