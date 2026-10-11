-- =========================================================================
-- Builders Ready — Migration 33: quote client-view controls
-- =========================================================================
-- Builders often don't want the client to see every line + the margin maths.
-- `client_detail_level` controls what the CLIENT sees on the PDF and the
-- public /q/<token> page (the builder always sees full detail in-app):
--   'itemised' → every line (current behaviour, default)
--   'grouped'  → Materials subtotal + Labour subtotal (+ Other if any)
--   'total'    → a single total price
-- `client_supplied` marks a line the customer provides themselves — shown on
-- the quote as provided-by-client and excluded from the price/cost totals.
-- =========================================================================
do $$ begin
  create type public.estimate_client_detail as enum ('itemised','grouped','total');
exception when duplicate_object then null; end $$;

alter table public.estimates
  add column if not exists client_detail_level public.estimate_client_detail
    not null default 'itemised';

alter table public.estimate_line_items
  add column if not exists client_supplied boolean not null default false;
