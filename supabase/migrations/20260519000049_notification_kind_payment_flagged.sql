-- New notification kind: builder is told when a client flags a cash / bank
-- transfer payment so they can confirm receipt. (ALTER TYPE ... ADD VALUE must
-- run on its own, outside a transaction with dependent statements.)
alter type public.notification_kind add value if not exists 'payment_flagged';
