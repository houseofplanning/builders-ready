-- =========================================================================
-- Builders Ready — Migration 10: project handover fields
-- =========================================================================
-- Three additive columns on `projects` needed for two related features:
--
--   1. Project finance accuracy
--      `quoted_amount_pence` captures the ORIGINAL quote the builder gave
--      the client at signup. Without it, the project_finance card can only
--      ever show variations-adjusted totals, never the quote-vs-final
--      variance that owners and clients care about.
--
--   2. End-of-project handover PDF (deferred build, design now)
--      `completed_at` is auto-stamped when status flips to 'completed'.
--      `handover_pdf_storage_path` points at the generated PDF once the
--      handover-pdf feature ships in a later session.
--
-- All three are nullable so existing projects don't need backfilling.
-- =========================================================================

alter table public.projects
  add column if not exists quoted_amount_pence bigint
    check (quoted_amount_pence is null or quoted_amount_pence > 0),
  add column if not exists completed_at timestamptz,
  add column if not exists handover_pdf_storage_path text;

-- -------------------------------------------------------------------------
-- Auto-stamp completed_at on status flips.
-- Clears the timestamp if status moves back to active/on_hold (rare,
-- usually a mistake-correction; we want completed_at to reflect the
-- current truth, not a historical-first-completion).
-- -------------------------------------------------------------------------
create or replace function public.on_project_status_change()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed'
     and (old.status is null or old.status <> 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status in ('active', 'on_hold') and old.status = 'completed' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists projects_status_change on public.projects;
create trigger projects_status_change
  before update of status on public.projects
  for each row execute procedure public.on_project_status_change();
