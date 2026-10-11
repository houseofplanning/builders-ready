# Builders Ready — Product Roadmap

Living document. Grouped by horizon. "Shipped" reflects what's live; everything
below the line is planned, not built.

---

## ✅ Shipped / live
Marketplace (homeowner ↔ trade, no per-lead fee) · on-site quoting & estimates (costs + margin, branded PDF, emailed to client, sign on phone) · public quote page with Accept/Decline + free client account that links the project automatically · project templates v1 (timeline/stages) · accepted quote → managed project · cost & margin tracking · contracts & staged invoices · Stripe Connect payments (receipts, refunds, retention) · "paid in cash" flow · handover PDF · unified messaging · two-way reviews · customer portal (web + mobile) · dashboard · Owner invite role + comped/Unlimited accounts + trade branding · marketing site (builder + homeowner).

---

## 🔜 Planned — near term

- **Marketplace job-type (trade category) filter — NEW.** Let builders filter the Find Work marketplace by trade — painting/decorating, plumbing, electrician, loft conversion, roofing, etc. — the way the area/postcode and status filters already work. Not urgent while job volume is low; becomes a major time-saver once there are hundreds of open jobs. *Low effort:* jobs already carry `trade_category` (the `TRADE_CATEGORIES` list) and the `open_jobs_feed` already exposes it, so this is mostly a filter control + query on both the mobile Find Work screen and the web find-work page (mirror the existing area/status filter pattern). Could default to the trade's own category and allow multi-select.

- **Quote templates v2.** Pick-from templates kept *current* with real material costs and genuine project types (e.g. single-storey extension, loft conversion, bathroom refit). The wedge vs. Price A Job / EstimatorXpress: their templates are outdated; ours stay current and usable out of the box. Full research, data-sourcing plan and UI mockups are in `docs/10_quotes_estimates_upgrade.md` (phases: A rate book → B assemblies → C templates → D price freshness → E reports). Needs a maintained material-cost library as its backbone, QS/estimator validation, and a pilot against real quotes before launch.
  - **✅ Slice 1 shipped (2026-10-11) — painting & decorating, mobile AND web, end-to-end.** New platform price engine (`material_items` + `labour_rates` + `quote_templates`, migration `…032`), with **data-grounded, cited suggested prices** (Dulux Trade material prices ex-VAT; conservative coverage vs maker TDS; decorator day-rate national average; Methvin labour-productivity norm) — each row carries a `source` + `priced_on` so the quote shows "priced as of <date>". Shared generator `generateQuoteFromTemplate()` turns a few answers (wall/ceiling area, coats, surface, woodwork, margin) into a fully-costed, **editable** draft at cost with the builder's single margin on top; it feeds the existing estimate editor unchanged (VAT/margin/PDF/e-sign/convert all still apply). Flow on both surfaces: Quotes → *Start from a template* → questions → live preview → *Build quote* → the normal editor, pre-filled. Web uses the same shared engine + a new `/[slug]/estimates/templates` page (`EstimateForm` gained a `seed` prop); app uses `quote-template.tsx`. Math verified against a worked example; RLS verified for signed-in builders; mobile + shared + web typecheck clean.
  - **Next slices:** per-tenant price overrides (builder's own merchant/gang rates) + "refresh to today's prices"; web rate-book + template manager; more trades (plumbing, tiling, brickwork…); then assemblies (B) and real project bundles (C).

- **Automated invoice reminders.** Auto-chase unpaid invoices (due-date nudge, then set intervals) until paid, toggleable per invoice.

---

## 🏗️ v2 — designed-for-now, build later
Groundwork is already in the schema so these are additive when the time comes (see `docs/02_architecture.md` §6):

- **Custom domains per tenant** — e.g. `portal.regalconstruction.com`. Needs a `tenants.custom_hostname` column + Vercel middleware; no data-model change.
- **Multi-tenant / unified account** — one login belonging to several accounts, incl. being both a project client *and* a marketplace customer on one account. Only the `tenant_members.user_id` uniqueness blocks it; the policy layer already supports it.
- **houseofplanning.co integration** — a nullable `planning_application_id` already sits on `projects`; integration logic is purely additive.

---

## 🗺️ Later / under consideration
Maintained material-cost library (backbone for quote templates) · push/email notifications (new quotes, messages, payments, reminders) · calendar/scheduling view · richer trade analytics (win rate, avg margin, pipeline) · public-facing reviews to help homeowners choose · decline-quote email to the builder.

---

## 💷 Business revisits (not features)
- Re-evaluate monthly-vs-annual nudge on Unlimited at ~6 months.
- Keep the 30-day Unlimited trial as a manual override only.

---

## 🛠️ Health / tech-debt (from the 2026-10-10 audit — see `docs/11`)
Deferred by choice, not urgent at current scale:
- **Performance pass** — add covering indexes on foreign keys, wrap per-row `auth.*()` calls in RLS, consolidate overlapping policies. Do before the user base grows.
- **L3 — job_requests address/geo** read exposure (columns currently empty; fix is app-side: repoint trade detail screens at the PII-safe feed).
- **Schema-drift reconciliation** — a few live-only DB objects (cash columns, `request_cash_payment`) aren't in migration files; matters only for fresh-environment rebuilds.
- Enable Supabase leaked-password protection (one toggle); minor cosmetic polish items.
