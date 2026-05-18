# Builders Ready

Multi-tenant SaaS construction client portal for UK premium-residential builders. Spinout of the [Regal Client Portal](../RCS%20Mobile%20App/) — same value, builder self-serve, monthly subscription.

**Status:** Sprint 0 scaffold landed 2026-05-18. Eight planning deliverables in `docs/`. Monorepo skeleton + 9 SQL migrations ready in `supabase/migrations/`.

## First-time setup (Windows / PowerShell)

```powershell
cd "C:\Users\abdul\Desktop\Builders Ready App"
pnpm install                       # ~3–5 minutes first run
cp apps\web\.env.local.example apps\web\.env.local
cp apps\mobile\.env.example apps\mobile\.env
# fill in the Supabase URL + anon key in both env files
```

Daily:

```powershell
pnpm web              # http://localhost:3000
pnpm mobile:tunnel    # scan QR with Expo Go
```

Supabase (migrations live in `supabase/migrations/`):

```powershell
supabase link --project-ref gxebyfkfrzijdpzntrkh
supabase db push                   # pushes pending migrations to live project
```

---

## Deliverables (review in order)

| # | File | What it is |
|---|---|---|
| 1 | [`docs/01_tech_stack_confirmation.md`](docs/01_tech_stack_confirmation.md) | Each stack layer with rationale + 11-row sign-off table |
| 2 | [`docs/02_architecture.md`](docs/02_architecture.md) | Tenant data model, RLS strategy, auth flow, Stripe webhook flow, deploy topology |
| 3 | [`docs/03_schema_migration_plan.md`](docs/03_schema_migration_plan.md) | 9-file migration set evolving Regal's schema to multi-tenant |
| 4 | [`docs/04_pricing_tiers.md`](docs/04_pricing_tiers.md) | Four tiers (£49 / £119 / £249 / £499), 14-day trial, rationale |
| 5 | [`docs/05_repo_structure.md`](docs/05_repo_structure.md) | Monorepo folder layout with rationale |
| 6 | [`docs/06_accounts_checklist.md`](docs/06_accounts_checklist.md) | New-from-Regal accounts (domain, two Supabase, Stripe, Resend, Apple Dev #2, etc.) |
| 7 | [`docs/07_wireframe.html`](docs/07_wireframe.html) | Clickable low-fi HTML — marketing landing, signup, onboarding wizard, admin dashboard |
| 8 | [`docs/08_market_positioning_and_pricing.md`](docs/08_market_positioning_and_pricing.md) | UK competitor scan + final pricing recommendation |

Open the wireframe in any modern browser. The other six are markdown — render best in VS Code's preview or any markdown viewer.

---

## Sign-off process

Each deliverable ends with a "Sign-off questions" block. Annotate each in chat or directly in the file. No code gets written until all seven have a tick or amendment.

## Once signed off

The next session creates the monorepo scaffolding (matching deliverable 5), applies migrations 1–9 from deliverable 3 against `builders-ready-dev`, and starts Sprint 0 Day 1.

## Reference

Regal codebase (read-only): `C:\Users\abdul\Desktop\RCS Mobile App\`. Every Builders Ready file is designed to port from a Regal equivalent with `tenant_id` added.
