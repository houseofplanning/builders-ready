# Builders Ready — Audit & Backlog (2026-10-11)

Full-codebase audit after the Quotes feature + the night's fixes. Verdict:
**no normal-use breakage, no security holes, no data-corruption paths.** Core
journeys work end to end for both the tradesman and the customer. The backlog
below is mostly pre-existing robustness/polish on older mobile screens.

Audit method: code review (web + mobile, Quotes and non-Quotes), TypeScript
typecheck (shared + mobile green; web verified clean by review agent), Supabase
security + performance advisors (whole DB), generator-maths verification, and a
regression check of the 11 fixes from this session. Not yet done: a live
click-through on a real device/browser (recommended before relying on it).

---

## ✅ Working (verified at code / type / DB / logic level)

### Tradesman (builder)
- Auth: login, password reset (min 8 chars), accept invite.
- Onboarding + branding (logo aspect correct).
- Dashboard: KPI tiles, margin row, recent projects (overdue badge fixed).
- Projects: list, create (template seeds timeline stages), detail, stages/
  timeline, updates, decisions, variations, reports, documents, handover PDF.
- **Quotes/Estimates:** blank quote + 17 "from a template" flows (9 measured,
  8 indicative), room-dimension inputs, client-view levels (itemised/grouped/
  total), client-supplied lines, branded PDF, email send, accept/sign →
  convert to project, duplicate, saved rates, **per-tenant rate book overrides**.
- Cost & margin tracking.
- Contracts + staged invoices; Stripe Connect payments (receipts, refunds,
  retention); "paid in cash" flow.
- Marketplace: find work, area/status filters, bids → itemised quote
  (accept guarded to submitted/shortlisted), messaging + unread, two-way reviews.
- Settings (name left-aligned); invoice/quote numbering numeric-safe.

### Customer / client
- Customer account, post a job, my requests, browse, messaging + unread, accept bids.
- Project portal (web `/me` + mobile `customer/`): project, updates, photos,
  decisions, variations (now name-guarded before signing), invoices, pay, reviews,
  handover PDF.
- Public quote page `/q/<token>`: view, accept/decline, create a free account
  (now guarded against attaching the project to an unrelated existing email),
  follow the project.
- Password reset, profile photo + name, contact/notification prefs.

### Security / platform
- RLS enabled on every table; marketplace-customer access via project
  counterparty; column-write guards on client-editable records.
- Client never sees builder cost/markup/margin (public page + PDF + shared
  breakdown all verified).
- Per-tenant price overrides isolated to the owning tenant (owner/PM only).
- Stripe webhook atomic idempotency; quote_templates write hardened to owner/PM.

---

## 🔧 Backlog — needs fixing

### P1 — resilience (pre-existing; affects unhappy paths, not normal use)
- **Mobile: ~16 screens have no error/not-found state** — `load()` lacks
  try/catch/finally, so a failed fetch or a bad/removed id spins forever with no
  back button (worst case: force-quit). Highest impact: `app/report/[id].tsx`,
  `app/customer/project-chat/[id].tsx`; also contract, reports, messages,
  find-work, project-costs, and most `customer/*` list/detail screens. Fix once
  with a shared pattern: try/finally that always clears `loading`, an error/not-
  found fallback with a back button, and clear `loading` on early returns.
- **Mobile chat: send/upload errors swallowed** — `project-chat.tsx` and
  `marketplace-thread.tsx` use try/finally with no catch; a failed send/attach
  gives no feedback. Add catch + alert.
- **Mobile signup: spinner can stick** — `(auth)/signup.tsx` never resets
  `submitting` on the email-confirmation path (no immediate session).

### P2 — correctness-lite & polish
- **Mobile invoices overdue never triggers** — `lib/invoices.ts` appends
  `'T00:00:00'` to a full ISO `due_at`, making an invalid Date; `slice(0,10)` first.
- **Placeholder-name copy** — unify "Someone" / "A builder" / "Your trade" /
  "Marketplace customer" (the last prints on a bid-generated quote via
  `lib/marketplace.ts createQuoteForBid`); omit "Raised/Posted by" lines when
  only a fallback resolves.
- **Mobile customer review form** — wrap in KeyboardAvoidingView/ScrollView;
  show a not-found state when the project is null.
- **Mobile costs** — `by_category[c.category]` has no out-of-enum guard.
- **Web: no root `error.tsx` / `not-found.tsx`** — a thrown Server Component
  error falls back to Next's generic page; add branded error + 404 pages.
- **Estimate update is non-atomic** — delete-then-insert line items with no
  transaction; a mid-write failure loses lines. Wrap in an RPC/transaction.
- **Quotes "total" client view** — renders a bare Subtotal/Total with no caption
  row; optional "Works — all-in" label.
- Minor mobile: duplicate `useEffect`+`useFocusEffect` double-fetch on several
  list screens; chat auto-scroll to newest; Android KeyboardAvoidingView behavior;
  a few dead styles / cosmetic layout nits; past example date in `customer/post.tsx`.

### P3 — deferred infra (already roadmapped; do as you scale)
- Performance pass: covering indexes on FKs, wrap per-row `auth.*()` in RLS,
  consolidate overlapping policies, drop unused indexes (Supabase advisors).
- Enable Supabase leaked-password protection (one toggle).
- Move `citext` / `pg_net` out of the public schema.
- Schema-drift reconciliation (a few live-only objects not in migration files).
- Quotes follow-ons: "refresh to today's prices", mobile rate-book editor,
  tenant-saved template manager.

---

## Fixed in this session (for reference)
Password min 8 · PM-name fallback · mobile quote emails client · customer back
button · `/q` reserved route · settings name alignment · epoch/`gbp` guards ·
acceptBid status guard · Stripe idempotency · numeric numbering · client-view +
client-supplied + room inputs + 17 templates + rate book · public-quote account-
link takeover guard · quote_templates RLS hardening · web edit data-loss
(line2/terms) · dashboard overdue enum · variation blank-signature guard.
