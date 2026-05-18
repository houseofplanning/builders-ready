# Builders Ready — Deliverable 1: Tech-Stack Confirmation

**Status:** Draft for your review.
**Date:** 18 May 2026
**Decision required:** ✅ or amendments to each row of the table at the end of this doc before any code is written.

---

## Headline

The Regal stack — Expo (managed) + Next.js 15 + Supabase (eu-west-2) + Stripe + Expo Push + pnpm workspaces + TypeScript — survives the multi-tenant rewrite **without a single substitution**. The two additions Builders Ready needs are Stripe Billing (Regal hasn't wired it) and a couple of operational choices that the Regal repo already exhibits: `node-linker=hoisted` for pnpm, Scoop for Supabase CLI, base64→ArrayBuffer for uploads. None of those is a stack change; they're conventions to carry forward.

The rest of this doc walks each layer with a one-paragraph rationale, including the **specific risk** introduced when we move from one tenant to many.

---

## 1. Mobile — React Native + Expo (managed workflow, EAS Build, EAS Update)

**Confirmed.** Expo's value compounds for a multi-tenant product: one binary, one App Store record, one OTA channel, but **runtime-resolved branding** lets every builder's clients see "their" builder's app. The single point where Builders Ready stresses the framework is asset swapping — logo, brand colour, business name — which we handle by reading those values from the tenant row at session start and injecting them into the theme provider rather than rebundling. EAS Update lets us patch copy or layout regressions within minutes for all tenants at once, which matters more for SaaS than it did for Regal (one unhappy tenant ≠ shut the whole product). Where Expo would be the wrong choice: if any tenant demanded a fully white-labelled binary on their own Apple Dev account — that's a v2 conversation and means a fork to bare workflow with a per-tenant `app.config.ts`, not a stack change. The `node-linker=hoisted` + Expo public-hoist patterns in Regal's `.npmrc` are non-negotiable carry-overs.

## 2. Web (marketing site + builder admin console) — Next.js 15 (App Router, Server Actions) on Vercel

**Confirmed.** Same single Next.js 15 app hosts (a) the public marketing site at `buildersready.uk`, (b) the builder admin console at `app.buildersready.uk` or `/app/*`, and (c) any internal API routes (Stripe webhooks, signed-URL minting, server-side admin actions). Splitting marketing and app into separate codebases is a temptation we should resist — for a one-person product the duplicated theme tokens, type defs, and Supabase client setup is operationally heavier than a single Next.js app with two route groups. Server Actions keep the admin console as a single React/Postgres surface without a separate API layer, which the Regal admin proves works for forms with role-checked writes. Tenancy enforcement on the web side relies on Supabase RLS plus a lightweight middleware that resolves the calling user's `tenant_id` from `auth.uid()` and pins it on a request-scoped context — see deliverable 2 for the mechanics.

## 3. Backend — Supabase (Postgres + Auth + Storage + Realtime + Edge Functions), London region

**Confirmed.** RLS is *the* reason this stack is fit for multi-tenancy. The Regal codebase already proves that all data isolation can live as Postgres policies (`current_role()`, `is_admin()`, `has_project_access(uuid)`); we extend that pattern with a `current_user_tenant_id()` helper and append `tenant_id = current_user_tenant_id()` to every existing policy. Single Supabase project, single Postgres database, all tenants sharing a schema with RLS as the wall — this is the well-trodden Supabase B2B pattern (see Supabase's own docs on multi-tenant SaaS) and avoids the operational pain of one DB per tenant. London (`eu-west-2`) is non-negotiable for UK GDPR and matches what Regal already runs on. Risk to manage: a single mis-coded policy or a forgotten `tenant_id` column could leak data across tenants — deliverable 2 specifies a "deny by default" RLS posture and a cross-tenant isolation test suite as Sprint-0 acceptance.

## 4. Billing — Stripe Billing (no Connect for v1)

**Confirmed with one clarification.** Stripe Billing handles subscription tiers, 14-day trials, proration on plan changes, dunning, the customer portal for builders to update card/cancel, and webhook events that flip the `tenants.subscription_status` column. Stripe Connect is **out of scope for v1**: builders accept client payments by bank transfer recorded against the invoice row (same as Regal's existing `invoices` table) — facilitating client→builder payments would force us into Stripe Connect Express + KYC for every tenant, which doubles the onboarding friction and the audit liability. Stripe Connect can be a v2 upgrade once we have signal that tenants actually want it. v1 implementation: one Stripe Product with four Prices (one per tier), four-tier metered subscription keyed by `active_project_count` from the DB, webhook handler in a Next.js API route, signing-secret in Vercel env vars.

## 5. Push notifications — Expo Push (free)

**Confirmed.** Regal's `20260517000006_push_notifications.sql` migration is a clean blueprint: Postgres triggers POST to `https://exp.host/--/api/v2/push/send` via `pg_net`, with the `notifications` row inserted regardless of push delivery so the in-app inbox stays correct even if Expo's relay is degraded. We carry that wholesale; the only changes are (a) the trigger functions read `tenant_id` from the row being inserted so we don't accidentally cross-broadcast, and (b) the push token table gains a `tenant_id` column for the same reason. Expo Push remains free at the volumes we'll see — even 50 active builders × 5 projects × 5 daily updates × 5 recipients is ~6k notifications/day, well within free-tier territory.

## 6. Monorepo — pnpm 9 workspaces

**Confirmed.** Regal proves the pnpm + Expo combination works *if* `.npmrc` declares `node-linker=hoisted` plus the Expo public-hoist patterns. The Builders Ready monorepo lives at `C:\Users\abdul\Desktop\Builders Ready App\` and mirrors Regal's layout: `apps/mobile`, `apps/web` (renamed from `apps/admin` because it now also hosts the marketing site), `packages/shared`, `supabase/`. Concrete folder layout is deliverable 5. Turborepo is not needed at our scale — pnpm filters (`pnpm --filter @br/mobile dev`) cover the daily ergonomics.

## 7. TypeScript everywhere

**Confirmed.** Hand-rolled domain types in `packages/shared/src/types.ts` are the consumer-facing surface; auto-generated `database.types.ts` from `supabase gen types typescript` is the secondary, regenerated whenever the schema changes. Zod schemas in `packages/shared/src/schemas.ts` cover form/IO validation in both apps. This is exactly the Regal pattern; no change.

---

## Things the brief lists as "Regal-stack same" that I'd flag explicitly

These are choices that survive the rewrite but deserve a sentence each because they're easy to forget when porting.

- **EAS Build + EAS Submit** for store delivery. Apple Dev account holder for Builders Ready: open question — see deliverable 6. Recommend a fresh Apple Dev enrolment under "Builders Ready Ltd" or under your personal name (the same individual-account pattern you used for Regal), held separately from the Regal account so a future Builders Ready sale doesn't entangle Regal's listing.
- **Expo Application Services — Starter ($19/mo)** for production builds. Free tier is fine for Sprint 0–1.
- **Resend** for transactional email (invitations, password resets, billing receipts). Free up to 3k/month; budget $20/mo at scale. Needs a DNS-verified domain — `mail.buildersready.uk` or `notify.buildersready.uk`. Replaces Supabase's default SMTP which is fine for dev but not branded.
- **Sentry** (free Developer plan) for crash + perf monitoring across mobile and web.
- **Image pipeline:** `expo-image-manipulator` client-side compression (≤2048 px long edge, JPEG q=0.82, ~250 KB) → Supabase Storage via base64 → ArrayBuffer (NOT `fetch().blob()`).
- **Supabase CLI on Windows: via Scoop.** Not npm. Two PowerShell blocks with a reopen between them. Same as Regal's `02_account_setup_checklist.md`.
- **Node 20 LTS pinned in `.nvmrc`**, tolerate Node 24 unless something breaks. (You have v24 installed.)

---

## Two areas I'd ask you to weigh in on

These are not stack changes but they're related decisions that lock in during deliverable 2:

1. **Single Supabase project vs. project-per-environment.** Regal currently runs one project that's both dev and prod (acceptable for a single-tenant pilot). For Builders Ready I'd recommend **two Supabase projects** from day one: `builders-ready-dev` and `builders-ready-prod`, both London region. Schema migrations push to dev first; prod gets a manual `supabase db push` once dev is green. Cost: ~$25/mo extra at Pro. Worth it for the safety net.
2. **Custom domain strategy.** Recommend `buildersready.uk` for marketing, `app.buildersready.uk` for the admin console (one Vercel project with two route groups, or two separate Vercel projects sharing env vars). Tenant slugs surface as a path segment (`app.buildersready.uk/<slug>/dashboard`) rather than subdomains, to keep TLS/DNS simple. Subdomains per tenant (`<slug>.buildersready.uk`) are a v2 conversation when builders ask for white-label URLs.

---

## Sign-off table

Tick / cross / amend each row and reply. I'll move to deliverable 2 (architecture) once these are settled.

| # | Layer | Choice | Your decision |
|---|---|---|---|
| 1 | Mobile | Expo (managed, EAS Build, EAS Update) | |
| 2 | Web | Next.js 15 (App Router, Server Actions) on Vercel — one app for marketing + admin | |
| 3 | Backend | Supabase (single project per env, London region, RLS for tenant isolation) | |
| 4 | Billing | Stripe Billing v1; Stripe Connect deferred to v2 | |
| 5 | Push | Expo Push (free) | |
| 6 | Monorepo | pnpm 9 workspaces, `node-linker=hoisted`, no Turborepo | |
| 7 | Language | TypeScript everywhere; Zod schemas; auto-gen DB types | |
| 8 | Email | Resend on a `mail.buildersready.uk` subdomain | |
| 9 | Monitoring | Sentry free tier | |
| 10 | Envs | Two Supabase projects (`-dev`, `-prod`), both London | |
| 11 | Domains | `buildersready.uk` + `app.buildersready.uk/<slug>/...`; per-tenant subdomains deferred | |

---

## Sources

- Regal repo: `C:\Users\abdul\Desktop\RCS Mobile App\` — `01_kickoff_plan.md`, `02_account_setup_checklist.md`, `03_status_2026-05-16.md`, `.npmrc`, `package.json`, `supabase/migrations/*`
- [Supabase pricing](https://supabase.com/pricing)
- [Expo Application Services pricing](https://expo.dev/pricing)
- [Stripe Billing pricing](https://stripe.com/billing/pricing)
- [Vercel pricing](https://vercel.com/pricing)
