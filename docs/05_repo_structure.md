# Builders Ready — Deliverable 5: Repo Structure

**Status:** Draft for your review.
**Date:** 18 May 2026
**Workspace:** `C:\Users\abdul\Desktop\Builders Ready App\`

---

## 0. Philosophy

Mirror Regal where possible. One new top-level (`apps/web/` instead of `apps/admin/`) because the marketing site and admin console share a Next.js app. One renamed package (`@br/shared` instead of `@rcs/shared`). Everything else lines up so that "port file X from Regal" is a mechanical operation.

---

## 1. Layout

```
Builders Ready App/
├── README.md
├── package.json                       # root workspace; "br-monorepo"
├── pnpm-workspace.yaml                # packages: apps/*, packages/*
├── pnpm-lock.yaml
├── .npmrc                             # node-linker=hoisted, Expo hoist patterns (carry from Regal verbatim)
├── .nvmrc                             # 20
├── .editorconfig
├── .gitignore                         # carry from Regal + add /docs/wireframe.html?no — keep tracked
├── tsconfig.base.json                 # shared TS config, paths to @br/shared
│
├── apps/
│   ├── mobile/                        # Expo Router app
│   │   ├── app/
│   │   │   ├── _layout.tsx            # TenantProvider + ThemeProvider wired here
│   │   │   ├── (auth)/                # /login, /forgot, /accept-invite
│   │   │   ├── (tabs)/                # home, timeline, updates, reports, messages, invoices
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx          # Home with FinanceSummary card
│   │   │   │   ├── timeline.tsx
│   │   │   │   ├── updates.tsx
│   │   │   │   ├── reports.tsx
│   │   │   │   ├── messages.tsx
│   │   │   │   ├── decisions.tsx      # NEW — Decisions inbox
│   │   │   │   └── invoices.tsx
│   │   │   ├── update/[id].tsx
│   │   │   ├── report/[id].tsx
│   │   │   ├── invoice/[id].tsx
│   │   │   ├── decision/[id].tsx      # NEW
│   │   │   └── variation/[id].tsx     # NEW
│   │   ├── components/
│   │   │   ├── BrandedHeader.tsx      # reads tenant.logo_url, tenant.name
│   │   │   ├── FinanceCard.tsx        # NEW
│   │   │   ├── TimelineRow.tsx
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── supabase.ts            # AsyncStorage adapter, makeSupabaseClient(...)
│   │   │   ├── tenant.ts              # TenantProvider, useTenant() hook, AsyncStorage cache
│   │   │   ├── theme.ts               # builds RN theme object from tenant brand colours + shared tokens
│   │   │   └── push.ts                # registerForPushAsync, save expo_token + tenant_id
│   │   ├── assets/
│   │   │   ├── icon.png               # Builders Ready icon (not tenant-specific)
│   │   │   ├── splash.png
│   │   │   └── ...
│   │   ├── app.config.ts              # uses env: EXPO_PUBLIC_SUPABASE_URL, etc.
│   │   ├── eas.json
│   │   ├── package.json               # name: "@br/mobile"
│   │   ├── tsconfig.json
│   │   └── metro.config.js
│   │
│   └── web/                           # Next.js 15 — marketing + admin + API
│       ├── app/
│       │   ├── (marketing)/           # route group; public, unauthenticated
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx           # /
│       │   │   ├── pricing/page.tsx
│       │   │   ├── about/page.tsx
│       │   │   ├── contact/page.tsx
│       │   │   ├── privacy/page.tsx
│       │   │   └── terms/page.tsx
│       │   ├── (auth)/
│       │   │   ├── signup/page.tsx
│       │   │   ├── login/page.tsx
│       │   │   ├── forgot/page.tsx
│       │   │   └── accept/page.tsx    # invite acceptance
│       │   ├── onboarding/
│       │   │   ├── layout.tsx
│       │   │   └── [step]/page.tsx    # step in (slug, brand, bank, invite)
│       │   ├── (app)/
│       │   │   ├── layout.tsx         # TenantContext + nav; reads slug from URL
│       │   │   ├── [slug]/
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── projects/page.tsx
│       │   │   │   ├── projects/[id]/page.tsx
│       │   │   │   ├── pms/page.tsx
│       │   │   │   ├── clients/page.tsx
│       │   │   │   ├── settings/
│       │   │   │   │   ├── branding/page.tsx
│       │   │   │   │   ├── billing/page.tsx
│       │   │   │   │   ├── bank/page.tsx
│       │   │   │   │   └── team/page.tsx
│       │   │   │   └── decisions/page.tsx
│       │   ├── api/
│       │   │   ├── webhooks/stripe/route.ts
│       │   │   ├── invite/route.ts
│       │   │   ├── billing/portal/route.ts     # creates Stripe billing portal session
│       │   │   └── health/route.ts
│       │   ├── layout.tsx                       # root layout
│       │   ├── globals.css
│       │   └── not-found.tsx
│       ├── components/
│       │   ├── marketing/                       # Hero, FeatureGrid, PricingTable, FAQ
│       │   ├── ui/                              # Button, Input, Card primitives
│       │   └── app/                             # ProjectRow, InviteForm, etc.
│       ├── lib/
│       │   ├── supabase-server.ts               # cookie-based server client
│       │   ├── supabase-browser.ts              # client-side singleton
│       │   ├── stripe.ts                        # Stripe SDK init
│       │   ├── tenant-resolver.ts               # given slug + auth, returns tenant or throws
│       │   ├── billing.ts                       # tier definitions, limit lookups
│       │   └── server-actions/                  # createTenant, inviteUser, createProject, ...
│       ├── middleware.ts                        # auth gate on /onboarding and /[slug]/*
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── package.json                          # name: "@br/web"
│       └── tsconfig.json
│
├── packages/
│   └── shared/                                   # @br/shared
│       ├── src/
│       │   ├── index.ts
│       │   ├── theme.ts                          # base tokens (spacing, radius, typography). Brand colours are tenant-resolved at runtime, not baked here.
│       │   ├── theme-builder.ts                  # buildTheme(brandPrimary, brandAccent) → token map
│       │   ├── types.ts                          # Tenant, TenantMember, Profile, Project, ...
│       │   ├── schemas.ts                        # Zod for forms and IO
│       │   ├── supabase.ts                       # makeSupabaseClient factory, BUCKETS constants
│       │   ├── database.types.ts                 # AUTOGEN — supabase gen types typescript
│       │   ├── billing.ts                        # tier limits map, price IDs
│       │   ├── format.ts                         # gbp(pence), date('DD Mon YYYY')
│       │   └── slug.ts                           # validateSlug(), normaliseSlug()
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 20260519000001_extensions_and_enums.sql
│       ├── 20260519000002_tenants_and_members.sql
│       ├── 20260519000003_profiles_and_helpers.sql
│       ├── 20260519000004_project_core.sql
│       ├── 20260519000005_rls_policies.sql
│       ├── 20260519000006_storage_buckets.sql
│       ├── 20260519000007_progress_and_push.sql
│       ├── 20260519000008_billing_guards.sql
│       └── 20260519000009_decisions_variations_finance.sql
│
├── docs/
│   ├── 01_tech_stack_confirmation.md
│   ├── 02_architecture.md
│   ├── 03_schema_migration_plan.md
│   ├── 04_pricing_tiers.md
│   ├── 05_repo_structure.md           # this file
│   ├── 06_accounts_checklist.md
│   ├── 07_wireframe.html              # clickable low-fi
│   └── adr/                           # architecture decision records — start when first major change happens
│
└── .github/
    └── workflows/
        ├── typecheck.yml              # pnpm typecheck on PR
        ├── migrations.yml             # supabase db push (dev) on merge to main
        └── eas-update.yml             # eas update for hotfixes (manual dispatch)
```

---

## 2. Notable choices vs. Regal

| Decision | Regal | Builders Ready | Why |
|---|---|---|---|
| Web folder name | `apps/admin/` | `apps/web/` | Now hosts marketing + admin + API in one Next.js app. Single deploy, shared layout/theme/types. |
| Shared package | `@rcs/shared` | `@br/shared` | Namespace change. |
| Mobile package | `@rcs/mobile` | `@br/mobile` | Same. |
| Theme file | Hardcoded Regal palette in `theme.ts` | Tokens only; brand colours injected at runtime by `theme-builder.ts` | Multi-tenant brand requires runtime resolution. |
| Settings table | `regal_settings` (single row) | Columns on `tenants` | Builder-level config now belongs to the tenant row. |
| Onboarding | Not applicable (Regal pre-seeded) | `/onboarding/[step]/page.tsx` | New product flow. |
| API routes | None (admin only used Server Actions) | `/api/webhooks/stripe`, `/api/invite`, `/api/billing/portal` | Stripe webhooks need a stable POST URL that bypasses auth middleware. |
| GitHub Actions | Not in Regal repo | Added | Worth doing from day one for typecheck + migration safety. |

---

## 3. Scripts in root `package.json`

```jsonc
{
  "name": "builders-ready",
  "private": true,
  "version": "0.1.0",
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" },
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "mobile":          "pnpm --filter @br/mobile dev",
    "mobile:tunnel":   "pnpm --filter @br/mobile dev --tunnel",
    "web":             "pnpm --filter @br/web dev",
    "build:mobile":    "pnpm --filter @br/mobile build",
    "build:web":       "pnpm --filter @br/web build",
    "lint":            "pnpm -r --parallel lint",
    "typecheck":       "pnpm -r --parallel typecheck",
    "supabase:start":  "supabase start",
    "supabase:stop":   "supabase stop",
    "supabase:push":   "supabase db push",
    "supabase:reset":  "supabase db reset --linked",
    "supabase:gen-types": "supabase gen types typescript --linked > packages/shared/src/database.types.ts"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "supabase":   "^1.200.0"
  }
}
```

This matches Regal's root script set so muscle memory carries.

---

## 4. Daily workflow

Two PowerShell windows, mirrors Regal:

```powershell
# Window 1 — web (marketing + admin + API)
cd "C:\Users\abdul\Desktop\Builders Ready App"
pnpm web                       # http://localhost:3000

# Window 2 — mobile (Expo Metro, tunnel mode on home WiFi)
cd "C:\Users\abdul\Desktop\Builders Ready App"
pnpm mobile:tunnel             # scan QR with Expo Go
```

Stripe webhooks during local dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` in a third window.

---

## 5. Env files

```
apps/web/.env.local                          # (gitignored)
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...
  STRIPE_SECRET_KEY=...
  STRIPE_WEBHOOK_SECRET=...
  STRIPE_PRICE_STARTER_MONTHLY=price_...
  STRIPE_PRICE_STARTER_ANNUAL=price_...
  STRIPE_PRICE_PRO_MONTHLY=price_...
  STRIPE_PRICE_PRO_ANNUAL=price_...
  STRIPE_PRICE_UNLIMITED_MONTHLY=price_...
  STRIPE_PRICE_UNLIMITED_ANNUAL=price_...
  RESEND_API_KEY=...
  SENTRY_DSN=...

apps/mobile/.env                              # (gitignored)
  EXPO_PUBLIC_SUPABASE_URL=...
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...
  EXPO_PUBLIC_SENTRY_DSN=...
```

`.env.example` files committed with placeholder values, mirroring Regal.

---

## Sign-off questions

- Marketing site and admin in one Next.js app, or split into two Vercel projects? (Single app recommended; deliverable 1 covers the rationale.)
- Onboarding routes at `/onboarding/[step]` (linear wizard with progress bar) — preferred to `/onboarding?step=brand` querystring approach.
- Do you want a `packages/ui/` for shadcn-style web components, or keep web UI components colocated in `apps/web/components/ui/`? Recommend the latter at this scale — premature abstraction otherwise.
