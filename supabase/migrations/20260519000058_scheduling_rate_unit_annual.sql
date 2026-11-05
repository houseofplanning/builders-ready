-- Migration 58: add 'annual' to rate_unit so permanent staff can be entered
-- as a salary. Kept as its own migration because ALTER TYPE ... ADD VALUE
-- must commit before the value is used by the cost trigger in migration 59.
alter type public.rate_unit add value if not exists 'annual';
