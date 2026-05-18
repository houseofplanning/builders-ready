-- =========================================================================
-- Builders Ready — Migration 1/9: extensions and enums
-- =========================================================================
-- Foundational types used by every later migration. Keep this file pure
-- (no tables) so that re-running `db reset` is fast and ordering is clear.
-- =========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists pg_net;

-- -------------------------------------------------------------------------
-- Tenancy
-- -------------------------------------------------------------------------
do $$ begin
  create type public.tenant_member_role as enum ('owner','pm','client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_tier as enum ('starter','pro','unlimited');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum (
    'trialing','active','past_due','cancelled','unpaid','suspended'
  );
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- Projects
-- -------------------------------------------------------------------------
do $$ begin
  create type public.project_status as enum (
    'active','on_hold','completed','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stage_status as enum (
    'not_started','in_progress','complete','delayed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_kind as enum ('pdf','structured');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum (
    'draft','sent','paid','overdue','cancelled'
  );
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- Decisions / variations (BR v1 differentiators)
-- -------------------------------------------------------------------------
do $$ begin
  create type public.decision_status as enum (
    'open','accepted','rejected','expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.variation_status as enum (
    'proposed','accepted','rejected','cancelled'
  );
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- Notifications
-- -------------------------------------------------------------------------
do $$ begin
  create type public.notification_kind as enum (
    'update_posted','stage_advanced','report_posted','message_received',
    'decision_needed',
    'invoice_sent','invoice_overdue','invoice_paid',
    'decision_raised','decision_decided',
    'variation_proposed','variation_decided',
    'trial_ending','billing_past_due'
  );
exception when duplicate_object then null; end $$;
