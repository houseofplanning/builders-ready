# Builders Ready — Deliverable 2: Architecture

**Status:** Draft for your review. Reads on top of deliverable 1 (tech-stack).
**Date:** 18 May 2026

---

## 0. One-paragraph summary

A single Supabase project per environment holds every tenant's data in a shared schema, with row-level security as the outer wall. Every business table carries a non-null `tenant_id`; every RLS policy filters by `current_user_tenant_id()`; every user belongs to exactly one tenant via `tenant_members`. A single Next.js 15 app serves the marketing site, the builder admin console, the Stripe webhook handler, and the invite endpoints. A single Expo binary serves every tenant's mobile clients, loading the tenant's brand at session start. Stripe Billing tracks subscription state which a small set of webhook handlers reflect onto `tenants.subscription_status`, and a Postgres trigger gates project creation against the active-project limit for the tenant's tier.

---

## 1. Tenant data model

Three new tables. Everything else is Regal's schema with `tenant_id` bolted on (covered in deliverable 3).

### `tenants`

The row that owns everything else.

```
id                       uuid PK
slug                     citext unique not null         -- 'regal', 'acme-renovations', URL-safe
name                     text not null                   -- 'Regal Construction Services Ltd'
logo_url                 text                            -- Supabase Storage path or absolute URL
brand_primary            text not null default '#0F2A3C' -- hex, drives the mobile theme
brand_accent             text not null default '#C9A24B' -- hex
business_email           text not null
business_phone           text
company_number           text                            -- UK Companies House number
vat_number               text
bank_name                text
bank_account_name        text
bank_sort_code           text                            -- displayed on invoices
bank_account_number      text                            -- displayed on invoices
stripe_customer_id       text unique
stripe_subscription_id   text unique
subscription_tier        public.subscription_tier        -- enum: starter|growth|scale|unlimited
subscription_status      public.subscription_status      -- enum: trialing|active|past_due|cancelled|unpaid|suspended
trial_ends_at            timestamptz
current_period_end       timestamptz
owner_user_id            uuid not null references auth.users(id)
status                   text not null default 'active'  -- 'active' | 'suspended' | 'archived'
created_at               timestamptz default now()
updated_at               timestamptz default now()
```

The slug uses `citext` so `Regal` and `regal` collapse to one. It's URL-segmenting (`app.buildersready.uk/<slug>/dashboard`), and we constrain it `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$`.

### `tenant_members`

The membership join. **v1 invariant:** a user belongs to exactly one tenant — enforced by the unique constraint on `user_id`. (Relaxing this later means dropping the unique and adding a `current_tenant_id` to a session/profile row; we design with that escape hatch in mind but not implement it.)

```
tenant_id   uuid not null references public.tenants(id) on delete cascade
user_id     uuid not null references auth.users(id) on delete cascade unique
role        public.tenant_member_role not null  -- enum: owner | pm | client
invited_by  uuid references auth.users(id)
invited_at  timestamptz
joined_at   timestamptz default now()
primary key (tenant_id, user_id)
```

`profiles` (which Regal already has, 1:1 with `auth.users`) keeps `full_name`, `email`, `avatar_url`, `phone`. Role is **removed** from `profiles` and lives in `tenant_members` instead — that's the cleanest expression of "role within tenant."

### `platform_admins`

Separate table for *you* (and any future Builders Ready ops staff). Not a tenant_members row with role=admin — keeps the security model explicit and prevents accidental cross-tenant role escalation.

```
user_id     uuid primary key references auth.users(id) on delete cascade
created_at  timestamptz default now()
```

`is_platform_admin()` SQL helper returns true if `auth.uid()` is in this table.

---

## 2. RLS strategy

The Regal pattern is intact, just doubled up. Every policy that previously checked `has_project_access(p)` or `is_admin()` now *also* checks tenant scope.

### Helper functions (all `security definer`, `set search_path = public`)

```sql
current_user_tenant_id()           -- returns the calling user's tenant_id (or null)
current_user_role()                -- returns the calling user's tenant_members.role
is_platform_admin()                -- returns true if user is in platform_admins
is_tenant_active(uuid)             -- subscription_status in ('trialing','active','past_due')
has_project_access(uuid)           -- tenant-scoped: project exists AND its tenant matches caller's tenant
                                   --                AND (caller is the client, the pm, or any role of an active tenant if admin)
```

### Policy pattern

Every policy is the conjunction of three predicates:

```
ROW BELONGS TO TENANT  AND  TENANT IS ACTIVE  AND  CALLER HAS ROW-LEVEL ROLE ACCESS
```

Worked example for `project_updates_read`:

```sql
create policy updates_read on public.project_updates
  for select using (
    tenant_id = public.current_user_tenant_id()      -- multi-tenant outer wall
    and public.is_tenant_active(tenant_id)           -- locks suspended/cancelled tenants out
    and public.has_project_access(project_id)        -- Regal's row-level rule
  );
```

Platform admins bypass via a parallel `OR public.is_platform_admin()` clause on every read; writes for platform admins live behind a separate explicit `_platform_all` policy per table (not auto-merged with tenant policies, to make audits easier).

### Storage policies

Object keys gain a tenant prefix:

```
update-photos/<tenant_id>/<project_id>/<update_id>/<filename>.jpg
reports/<tenant_id>/<project_id>/<filename>.pdf
avatars/<user_id>/avatar.jpg                  -- avatar paths stay user-keyed; not tenant-scoped
```

Storage RLS checks the first segment matches the caller's tenant before delegating to the row-level rule.

### Deny-by-default acceptance test

Sprint-0 acceptance includes a cross-tenant isolation test: seed two tenants (A and B), with a project each; assert that a logged-in user in tenant A receives `0 rows` from every business table when filtering at the API layer with no manual `tenant_id` filter — i.e. RLS does its job alone. Test runs via Supabase's pg-rpc in CI on every PR.

---

## 3. Auth flow

Two paths in: a brand-new builder signing up, and an invited user (PM or client).

### A — Builder signup (new tenant)

```
1. Visitor hits /signup
2. Submits email + password + business name
   → Server Action:
       a. supabase.auth.signUp({email, password})       // creates auth.users + profiles
       b. insert into tenants  ( ... owner_user_id = newUser.id )
       c. insert into tenant_members (tenant_id, user_id, role='owner')
       d. stripeCustomer = stripe.customers.create({email, metadata:{tenant_id}})
       e. stripeSub      = stripe.subscriptions.create({
                              customer, items:[{price:STARTER}],
                              trial_period_days:14,
                              payment_behavior:'default_incomplete',
                              metadata:{tenant_id}
                           })
       f. update tenants set stripe_customer_id, stripe_subscription_id,
                             subscription_tier='starter',
                             subscription_status='trialing',
                             trial_ends_at = now() + 14 days
3. Redirect to /onboarding/<slug>
   - Step 1: slug + logo upload
   - Step 2: brand colours (primary + accent picker, live preview)
   - Step 3: bank details (for invoice display)
   - Step 4: invite first PM (skippable)
4. Land on /<slug>/dashboard
```

Card collection happens **at signup, not at trial end** — Stripe's `default_incomplete` plus the `payment_behavior` flag means we collect the card now and only charge when the trial converts. This dramatically reduces involuntary churn.

### B — Invited user (PM or client)

We don't use Supabase's generic invite (it creates an auth user without a tenant). Instead, we mint an invite token row:

```
invitations:
  id, tenant_id, email, role, invited_by, token (text unique),
  expires_at (default now()+7d), accepted_at, created_at
```

The flow:

```
1. Builder admin enters email + role in the console.
2. Server Action: insert into invitations; send email via Resend with link
       https://app.buildersready.uk/accept?token=<...>
3. Invitee clicks link → /accept page validates token → form for name + password
4. Server Action:
       a. supabase.auth.signUp(email, password)
       b. insert into tenant_members (tenant_id, user_id, role)  // role from invitation
       c. update invitations set accepted_at = now()
5. Redirect to either /<slug>/pm/dashboard or the mobile-app deep link if a client
```

Reused invite tokens fail (`accepted_at is not null`). Expired tokens fail. Email mismatch on auth signup is allowed (a client can use a different email on the auth user vs. where the invite was sent), but logged in `invitations.accepted_via_email` for forensics.

### C — Login + tenant resolution

```
1. User signs in via Supabase Auth (email + password, biometric on mobile).
2. App reads auth.user.id, queries:
       select tm.tenant_id, tm.role, t.* from tenant_members tm join tenants t on t.id=tm.tenant_id where tm.user_id=auth.uid()
3. Brand context (logo_url, brand_primary, brand_accent, name) loaded into a TenantProvider; mobile caches it in AsyncStorage with a 24-hour TTL.
4. All subsequent queries pass through RLS — no manual tenant_id filter ever appears in app code.
```

The fact that **app code never writes `tenant_id` in WHERE clauses** is intentional: it's the only way to be sure that adding a new screen can't accidentally leak. If it isn't in the policy, it isn't accessible.

---

## 4. Stripe webhook flow

One endpoint, one signing secret, ~6 event handlers. Lives at `apps/web/app/api/webhooks/stripe/route.ts`.

### Events we handle

| Event | What we do |
|---|---|
| `customer.subscription.created` | Confirm tenant.subscription_id matches; set status. |
| `customer.subscription.updated` | Update `subscription_tier`, `subscription_status`, `current_period_end`, `trial_ends_at`. |
| `customer.subscription.deleted` | Set status='cancelled', flip tenant.status to 'suspended' after 7-day grace. |
| `invoice.payment_succeeded` | Mostly no-op; stamp `current_period_end`. |
| `invoice.payment_failed` | Status → 'past_due'. Banner appears in admin console. |
| `customer.subscription.trial_will_end` | Send "trial ending in 3 days" email via Resend. |

### Idempotency

Stripe webhooks can fire twice. We dedupe by storing `stripe_event_id` in a `webhook_events` table with a unique constraint and returning early if the event was already processed. Verified with the Stripe signing secret on every request; reject 400 if signature fails.

### Project-count enforcement

Subscription tier limits live in code (not in DB), but enforcement lives in DB. **Three tiers** — `starter`, `pro`, `unlimited` — gating up to 10, 50, and effectively unlimited active projects respectively.

```sql
create or replace function public.enforce_project_limit()
returns trigger language plpgsql security definer as $$
declare
  active_count int;
  tier text;
  limit_count int;
begin
  if new.status not in ('active','on_hold') then return new; end if;
  select count(*) into active_count from public.projects
    where tenant_id = new.tenant_id and status in ('active','on_hold');
  select subscription_tier::text into tier from public.tenants where id = new.tenant_id;
  limit_count := case tier
    when 'starter'    then 10
    when 'pro'        then 50
    when 'unlimited'  then 100000
    else 0
  end;
  if active_count > limit_count then
    raise exception 'Project limit reached for tier % (limit: %, current: %)', tier, limit_count, active_count - 1
      using errcode='check_violation';
  end if;
  return new;
end $$;

create trigger projects_enforce_limit
  after insert or update of status on public.projects
  for each row execute procedure public.enforce_project_limit();
```

The admin console catches this exception and surfaces an "upgrade your plan to add more projects" CTA. The block is **hard** (confirmed): builders cannot create the 11th / 51st project without upgrading.

---

## 5. Deploy topology

```
                                Vercel
                          ┌──────────────────┐
   buildersready.uk ────▶│                  │
                          │  Next.js 15 app  │
   app.buildersready.uk ▶│  (marketing +    │
                          │   admin + API)   │
                          └────────┬─────────┘
                                   │
                ┌──────────────────┼───────────────────┐
                │                  │                   │
                ▼                  ▼                   ▼
        Supabase eu-west-2   Stripe (UK)       Resend (EU)
        ┌─────────────────┐                     (email)
        │ Postgres + Auth │
        │ + Storage + RT  │
        └─────────────────┘
                │
                ▼ (push triggers via pg_net)
        Expo Push API
                │
                ▼
        ┌──────────────┐         ┌──────────────┐
        │ Builders     │         │ Builders     │
        │ Ready iOS    │         │ Ready Android│
        │ (single bin) │         │ (single bin) │
        └──────────────┘         └──────────────┘
```

- **Vercel project:** one for marketing + admin + API routes. Custom domains: `buildersready.uk` (apex, marketing) and `app.buildersready.uk` (admin / signup / accept). Stripe webhook lives at `app.buildersready.uk/api/webhooks/stripe`.
- **Supabase:** one hosted project, eu-west-2 (London). Named `builders-ready`. Local development uses Supabase's CLI emulator (`supabase start`) — migrations are written and smoke-tested against the local DB first, then pushed to production. Risky changes (schema rewrites, RLS overhauls) are pushed during pre-announced maintenance windows — overnight 00:00–06:00 UK time or weekend slots — with an in-app banner and email notice to tenants.
- **Expo:** one project, one Apple Dev account, one Google Play account, one EAS Update channel. Single binary on the App Store and Play Store named "Builders Ready".
- **Resend:** one project, domain `notify.buildersready.uk` (or `mail.buildersready.uk`). DKIM/SPF/DMARC at the DNS layer.
- **Sentry:** two projects — `builders-ready-mobile` and `builders-ready-web`. Same org.
- **Stripe:** one Stripe account in GBP (UK), separate from any account tied to Regal. Test mode → live mode toggle during launch.

---

## 6. What gets thought about in v2 but designed for now

Three "future-proofing" hooks I'd build now so they don't bite us:

1. **Custom domains per tenant** (`portal.regalconstruction.com`). The slug-as-path-segment design means we only need to add a `tenants.custom_hostname` column and a Vercel middleware that reads the request hostname and rewrites to the slug. No data-model change.
2. **Multi-tenant user (one user in N tenants).** The `tenant_members.user_id` unique constraint is the only thing blocking it. Drop the constraint + add `current_tenant_id` to a session row and the rest of the policy infrastructure already handles it.
3. **houseofplanning.co integration.** Add a nullable `planning_application_id text` to `projects` now. Nothing else changes; integration logic is purely additive.

---

## Sign-off questions

I'll move to deliverable 3 with these as the working assumptions unless you flag otherwise:

- One user belongs to exactly one tenant in v1. ✅ (confirmed)
- Slug-as-path-segment, no per-tenant subdomain in v1. ✅ (confirmed)
- Card collected at signup, not at trial end. ✅ (confirmed)
- One Supabase project; local emulator for dev; maintenance windows for risky migrations. ✅ (confirmed)
- Project-count enforcement in DB trigger as a **hard block** with upgrade CTA. ✅ (confirmed)
- Platform admins as a separate table, not a tenant_members role.
- Three pricing tiers (up to 10 / up to 50 / unlimited active projects). ✅ (confirmed; final numbers TBC after competitor research — see Deliverable 8).
