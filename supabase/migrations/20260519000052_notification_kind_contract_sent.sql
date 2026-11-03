-- =========================================================================
-- Builders Ready — Migration 52: add 'contract_sent' notification kind
-- =========================================================================
-- Clients now get notified when their builder sends a contract to sign.
-- The enum value must be committed before any function/trigger can use it,
-- so it lives in its own migration (migration 53 adds the triggers).
-- =========================================================================

alter type public.notification_kind add value if not exists 'contract_sent';
