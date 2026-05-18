# Builders Ready — Deliverable 3: Schema Migration Plan

**Status:** Draft for your review.
**Date:** 18 May 2026
**Source schema:** `C:\Users\abdul\Desktop\RCS Mobile App\supabase\migrations\*.sql` (7 migrations, read in full).

---

## 0. What this is — and isn't

This is **not** an in-place migration of Regal's live database. The Regal Supabase project keeps running for Regal Construction Services Ltd; Builders Ready gets its own fresh Supabase project. What this doc lays out is the **migration set the new project will start with** — built by transforming each Regal migration into its multi-tenant equivalent, retaining the exact security-definer + RLS patterns Regal proved work in production.

The migrations are designed to run sequentially against a brand-new Supabase project (`builders-ready-dev` first, `builders-ready-prod` second once smoke tests pass). Every migration is wrapped in an implicit transaction by the Supabase CLI; one notable exception around enum `add value` carries forward from Regal.

---

## 1. Migration set (9 files)

Filenames use the date stamp 2026-05-19 (the day after sign-off) for ordering legibility — adjust on the day you actually run them.

```
supabase/migrations/
  20260519000001_extensions_and_enums.sql
  20260519000002_tenants_and_members.sql
  20260519000003_profiles_and_helpers.sql
  20260519000004_project_core.sql
  20260519000005_rls_policies.sql
  20260519000006_storage_buckets.sql
  20260519000007_progress_and_push.sql
  20260519000008_billing_guards.sql
  20260519000009_decisions_variations_finance.sql
```

The next nine sections walk each file's responsibility and call out the diff from Regal.

---

## 2. `20260519000001_extensions_and_enums.sql`

Mirrors Regal's `init_schema` extension block plus all the enums Regal accumulated across migrations 1 and 7.

- `create extension if not exists pgcrypto;`
- `create extension if not exists citext;` (new — `tenants.slug` uses this)
- `create extension if not exists pg_net;` (Regal added in migration 6; we pull it forward)

Enums (consolidated; Regal scattered some across multiple migrations):

```sql
create type public.tenant_member_role        as enum ('owner','pm','client');
create type public.subscription_tier         as enum ('starter','pro','unlimited');
create type public.subscription_status       as enum ('trialing','active','past_due','cancelled','unpaid','suspended');
create type public.project_status            as enum ('active','on_hold','completed','archived');
create type public.stage_status              as enum ('not_started','in_progress','complete','delayed');
create type public.report_kind               as enum ('pdf','structured');
create type public.invoice_status            as enum ('draft','sent','paid','overdue','cancelled');
create type public.decision_status           as enum ('open','accepted','rejected','expired');
create type public.variation_status          as enum ('proposed','accepted','rejected','cancelled');
create type public.notification_kind         as enum (
  'update_posted','stage_advanced','report_posted','message_received','decision_needed',
  'invoice_sent','invoice_overdue','invoice_paid',
  'decision_raised','decision_decided','variation_proposed','variation_decided',
  'trial_ending','billing_past_due'
);
```

`user_role` from Regal is **dropped** — role lives on `tenant_members.role` (above) and `platform_admins` is a separate table.

---

## 3. `20260519000002_tenants_and_members.sql`

The three multi-tenancy tables, fully spec'd. (Columns listed in deliverable 2 §1.)

```sql
create table public.tenants ( ... );
create unique index tenants_slug_idx on public.tenants(slug);
create index tenants_subscription_idx on public.tenants(subscription_status);

create table public.tenant_members (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade unique,
  role        public.tenant_member_role not null,
  invited_by  uuid references auth.users(id),
  invited_at  timestamptz,
  joined_at   timestamptz default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_tenant_idx on public.tenant_members(tenant_id);

create table public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz default now()
);

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  email       citext not null,
  role        public.tenant_member_role not null,
  invited_by  uuid not null references auth.users(id) on delete restrict,
  token       text not null unique,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_via_email citext,
  created_at  timestamptz default now()
);
create index invitations_email_idx on public.invitations(email) where accepted_at is null;
create index invitations_tenant_idx on public.invitations(tenant_id);
```

`citext` on email gives case-insensitive lookups for free.

---

## 4. `20260519000003_profiles_and_helpers.sql`

Regal's `profiles` + `handle_new_user` trigger, **minus the role column**. Role moves to `tenant_members`. All helper functions used by RLS land here.

Differences from Regal:

- `profiles.role` column **dropped**.
- `handle_new_user()` no longer inserts a role; it inserts `id`, `email`, `full_name` only.
- New helpers:
  - `current_user_tenant_id()` — looks up `tenant_members.tenant_id` for `auth.uid()`. Returns NULL if no membership (used as a deny-by-default lever).
  - `current_user_role()` — returns `tenant_members.role` for `auth.uid()`.
  - `is_platform_admin()` — returns true if `auth.uid() in (select user_id from platform_admins)`.
  - `is_tenant_active(uuid)` — returns true if the given tenant's `subscription_status` is in `('trialing','active','past_due')` AND tenant's `status = 'active'`.
- `has_project_access(uuid)` is rewritten to be tenant-scoped:

```sql
create or replace function public.has_project_access(p uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.projects pr
    where pr.id = p
      and pr.tenant_id = public.current_user_tenant_id()
      and (
        pr.client_id = auth.uid()
        or pr.pm_id = auth.uid()
        or public.current_user_role() = 'owner'
      )
  ) or public.is_platform_admin();
$$;
```

The `owner` clause is new: tenant owners can access every project in their tenant (replaces Regal's "admin sees everything" within a tenant).

---

## 5. `20260519000004_project_core.sql`

Regal's `projects` / `project_stages` / `project_updates` / `update_photos` / `reports` / `messages` / `notifications` / `push_tokens`, **each with a `tenant_id uuid not null references tenants(id) on delete cascade` column added**, plus a composite index on `(tenant_id, ...)` for any query path the app hits often.

Worked diff for `projects`:

```sql
create table public.projects (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,  -- NEW
  name                text not null,
  address_line1       text not null,
  address_line2       text,
  city                text not null,
  postcode            text not null,
  client_id           uuid not null references public.profiles(id) on delete restrict,
  pm_id               uuid not null references public.profiles(id) on delete restrict,
  status              public.project_status not null default 'active',
  start_date          date not null,
  estimated_end_date  date not null,
  actual_end_date     date,
  progress_percent    smallint not null default 0 check (progress_percent between 0 and 100),
  current_stage_id    uuid,
  planning_application_id text,                                                       -- NEW (v2-prep, see deliverable 2)
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index projects_tenant_idx on public.projects(tenant_id, status);
create index projects_client_idx on public.projects(tenant_id, client_id);
create index projects_pm_idx on public.projects(tenant_id, pm_id);
```

Same pattern for the other seven tables. `update_photos` and `notifications` need `tenant_id` even though it's denormalised from the parent, because their RLS policies filter on it directly (avoiding a join per row).

Storage object key constants change: the path is now `<tenant_id>/<project_id>/<update_id>/<filename>.jpg`.

`regal_settings` is **deleted**. Bank details live on `tenants` (see deliverable 2 §1).

A check constraint added on `update_photos`, `messages`, `reports`, `project_updates`, `notifications`: `tenant_id` must equal the parent project's `tenant_id`. Enforced by a trigger (`assert_tenant_match`) because Postgres doesn't allow subquery check constraints. Trigger raises if mismatch — defence in depth for the case where a careless server-side write tries to cross-pollinate.

---

## 6. `20260519000005_rls_policies.sql`

Rewrites every Regal RLS policy with the **outer wall** added. The shape is uniform; the policy below is the template every other table follows.

```sql
alter table public.projects enable row level security;

create policy projects_read on public.projects
  for select using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        client_id = auth.uid()
        or pm_id   = auth.uid()
        or public.current_user_role() = 'owner'
      )
    )
  );

create policy projects_write on public.projects
  for all using (
    public.is_platform_admin()
    or (
      tenant_id = public.current_user_tenant_id()
      and public.is_tenant_active(tenant_id)
      and (
        public.current_user_role() in ('owner','pm')
        and (public.current_user_role() = 'owner' or pm_id = auth.uid())
      )
    )
  ) with check (
    tenant_id = public.current_user_tenant_id()
  );
```

The full file ports the 26 Regal policies and adds:

- `tenants_self_read` — members of a tenant can read their own tenant row.
- `tenants_owner_update` — only role='owner' can update branding, bank details, name.
- `tenant_members_*` — owners can read/insert/delete members; users can read their own membership row.
- `invitations_*` — owners and PMs (configurable) can create invitations; the invited user can read their own pending invitation when presenting a valid token (handled by an RPC, not a raw SELECT).
- `platform_admins_*` — only platform admins can read/write this table.

### Cross-tenant isolation test

The same migration installs a tiny test harness:

```sql
create schema if not exists br_tests;
create or replace function br_tests.assert_zero_rows_across_tenants(other_user uuid) ...
```

It runs in CI with two seeded tenants and asserts that switching the calling user from tenant A to tenant B returns zero rows from `projects`, `project_updates`, `update_photos`, `reports`, `messages`, `invoices`, `decisions`, `variations`, `notifications`. Done as `SET LOCAL "request.jwt.claims" = ...` to fake `auth.uid()` from pg.

---

## 7. `20260519000006_storage_buckets.sql`

Three buckets again, with tenant-prefixed object key policies. Object key shape:

```
update-photos/<tenant_id>/<project_id>/<update_id>/<filename>.jpg
reports/<tenant_id>/<project_id>/<filename>.pdf
avatars/<user_id>/avatar.jpg
```

Policy template (using Regal's `storage.foldername(name)` pattern):

```sql
create policy "update_photos_read" on storage.objects for select using (
  bucket_id = 'update-photos'
  and (storage.foldername(name))[1]::uuid = public.current_user_tenant_id()
  and public.has_project_access((storage.foldername(name))[2]::uuid)
);
```

Avatars stay user-keyed (no tenant prefix) — the avatar bucket is public-read and a user only writes to `<their_user_id>/avatar.jpg`. This is unchanged from Regal.

Admin write override (Regal's `storage_admin_access` migration) is replaced by an `owner`/PM write rule that also requires tenant match.

---

## 8. `20260519000007_progress_and_push.sql`

The progress trigger from Regal (`recompute_project_progress`, `on_stage_change`) ports verbatim — it operates on `project_id` and doesn't care about tenants.

The push-notification machine (Regal's migration 6 — `send_push`, `other_party_on_project`, four triggers) ports with two changes:

1. `send_push` reads `tenant_id` from the notifying row and writes it into the `notifications` row it inserts.
2. New trigger `on_decision_decided` and `on_variation_proposed` for the two new features (see migration 9).
3. New trigger `on_billing_status_changed` writes a notification when a tenant's subscription flips to `past_due` or `cancelled` (in-app banner data; not a push).

The `pg_net` POST URL is unchanged: `https://exp.host/--/api/v2/push/send`.

---

## 9. `20260519000008_billing_guards.sql`

Where the project-count limit lives (deliverable 2 §4):

```sql
create function public.enforce_project_limit() ... ;
create trigger projects_enforce_limit
  after insert or update of status on public.projects
  for each row execute procedure public.enforce_project_limit();
```

Plus a small `webhook_events` table for Stripe idempotency:

```sql
create table public.webhook_events (
  id                  uuid primary key default gen_random_uuid(),
  stripe_event_id     text not null unique,
  event_type          text not null,
  tenant_id           uuid references public.tenants(id) on delete set null,
  payload             jsonb not null,
  processed_at        timestamptz not null default now()
);
```

RLS: platform admins only.

---

## 10. `20260519000009_decisions_variations_finance.sql`

The three differentiator features from the brief (B.8–B.10). Designed as additive — keeps Regal's tables untouched and stands alongside them.

### `decisions` + `decision_options`

```sql
create table public.decisions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  project_id      uuid not null references public.projects(id) on delete cascade,
  raised_by       uuid not null references public.profiles(id),
  title           text not null,
  description     text,
  deadline        date,
  status          public.decision_status not null default 'open',
  selected_option_id uuid,             -- set when accepted
  decided_at      timestamptz,
  decided_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table public.decision_options (
  id              uuid primary key default gen_random_uuid(),
  decision_id     uuid not null references public.decisions(id) on delete cascade,
  tenant_id       uuid not null,                              -- denormalised for RLS
  label           text not null,
  description     text,
  price_gbp_pence bigint check (price_gbp_pence >= 0),
  photo_storage_path text,
  position        smallint not null default 0
);

create index decisions_project_idx on public.decisions(tenant_id, project_id, deadline);
```

RLS: read = `has_project_access`; insert by PM/owner; "accept/reject" update by client only (sets `selected_option_id`, `status='accepted'/'rejected'`, `decided_at`, `decided_by = auth.uid()`).

### `variations` (change orders)

```sql
create table public.variations (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  proposed_by         uuid not null references public.profiles(id),
  number              text not null,                          -- 'VAR-2026-007'
  title               text not null,
  description         text,
  delta_amount_gbp_pence  bigint not null,                    -- can be negative
  delta_days              smallint not null default 0,
  status              public.variation_status not null default 'proposed',
  decided_at          timestamptz,
  decided_by          uuid references public.profiles(id),
  client_signature    text,                                   -- typed name (audit trail)
  created_at          timestamptz default now(),
  unique (tenant_id, number)
);

create index variations_project_idx on public.variations(tenant_id, project_id, created_at desc);
```

When `status='accepted'`, a separate function `recompute_project_value()` runs to update a materialised `project_finance` view. (Keeps invoice + variation logic out of the app layer.)

### Project finance view

```sql
create or replace view public.project_finance as
  select
    pr.id as project_id,
    pr.tenant_id,
    coalesce(sum(case when v.status='accepted' then v.delta_amount_gbp_pence else 0 end), 0) as variations_pence,
    (select coalesce(sum(amount_gbp_pence),0) from public.invoices i where i.project_id = pr.id and i.status in ('sent','paid','overdue')) as invoiced_pence,
    (select coalesce(sum(amount_gbp_pence),0) from public.invoices i where i.project_id = pr.id and i.status = 'paid') as paid_pence,
    (select count(*) filter (where status='open') from public.decisions d where d.project_id = pr.id) as open_decisions
  from public.projects pr
  left join public.variations v on v.project_id = pr.id
  group by pr.id, pr.tenant_id;
```

Mobile home card reads this for the Project Finance Summary. RLS on the underlying tables is enough (views inherit caller permissions in Postgres ≥15).

### Invoices port (Regal's migration 7)

The Regal `invoices` table ports verbatim **plus** `tenant_id`. The `regal_settings` table is dropped; the on-invoice display reads `bank_*` from `tenants`. The `on_invoice_inserted` and `on_invoice_paid` triggers carry over with tenant-aware `send_push`.

---

## 11. Operational notes

- **All migrations idempotent.** Use `create table if not exists` and `do $$ ... pg_enum ... $$` guards where needed (Regal's invoice migration is the template for the enum value pattern).
- **Backfill.** Not applicable — fresh DB.
- **Indices.** Every `tenant_id` column carries an index, since virtually every query filters on it (via RLS, which becomes a join under the planner).
- **Seed.** A small `seed.sql` creates one demo tenant, one platform admin (you), three projects, one PM, two clients, one decision, one variation, one invoice. Useful for testing wireframes and the cross-tenant isolation harness.
- **`pnpm supabase:gen-types`** regenerates `packages/shared/src/database.types.ts` after every migration. CI runs it on every PR to catch drift.

---

## 12. Diff summary table

| Regal table | BR table | Change |
|---|---|---|
| `profiles` | `profiles` | role column dropped; otherwise unchanged |
| (none) | `tenants` | new |
| (none) | `tenant_members` | new |
| (none) | `platform_admins` | new |
| (none) | `invitations` | new |
| `regal_settings` | — | deleted; bank/vat/company fields move to `tenants` |
| `projects` | `projects` | +tenant_id, +planning_application_id |
| `project_stages` | `project_stages` | +tenant_id |
| `project_updates` | `project_updates` | +tenant_id |
| `update_photos` | `update_photos` | +tenant_id |
| `reports` | `reports` | +tenant_id |
| `messages` | `messages` | +tenant_id |
| `notifications` | `notifications` | +tenant_id |
| `push_tokens` | `push_tokens` | +tenant_id |
| `invoices` | `invoices` | +tenant_id; bank fields no longer joined from `regal_settings` |
| (none) | `decisions`, `decision_options` | new |
| (none) | `variations` | new |
| (none) | `webhook_events` | new |

| Regal helper | BR helper | Change |
|---|---|---|
| `current_role()` | — | replaced by `current_user_role()` (reads from tenant_members) |
| `is_admin()` | `is_platform_admin()` + `current_user_role()='owner'` | renamed; semantics split |
| `has_project_access(uuid)` | `has_project_access(uuid)` | now tenant-scoped |
| (none) | `current_user_tenant_id()` | new |
| (none) | `is_tenant_active(uuid)` | new |
| (none) | `enforce_project_limit()` | new |

---

## Sign-off questions

- Are you happy with `tenant_id` denormalised onto child tables (update_photos, notifications, etc.) for RLS performance, given the integrity trigger guards against drift?
- The decisions feature has `decision_options` as a separate table (so PMs can attach photos + prices to each option). Alternative: jsonb array on `decisions.options`. I went relational — easier RLS, photo paths play with Storage policies more cleanly.
- Variations have a `client_signature text` column for typed-name audit. Acceptable for v1 legal audit trail, or do you want a separate `variation_signatures` table with timestamp + IP? I'd defer the latter to v2.
