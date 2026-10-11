# Builders Ready — Full codebase/app/DB audit

**Date:** 2026-10-10
**Scope:** Supabase schema + RLS, web app (Next.js), mobile app (Expo), shared package. Automated Supabase advisors + four deep code audits, with the high-severity DB items **verified against the live database** (not just the migration files).

Severities: **Critical** (exploitable cross-tenant / money loss, live) · **High** (breaks a core flow or real integrity/privacy hole, live) · **Medium** · **Low/hardening** · **Performance**.
Each line: `where | issue | impact`. Verification tag: **[live-verified]** = confirmed against prod DB; **[code]** = from code review.

---

## ✅ Already safe — do NOT spend time on these (verified live)

The audit flagged these as critical, but I confirmed each is already mitigated in production:

- **`project_finance` view cross-tenant leak** — the live view has `security_invoker=on`; a client reading another tenant's finance row returns **0 rows**. Not a leak. [live-verified]
- **`send_push()` callable by anyone** — `EXECUTE` is **revoked** from `authenticated` and `anon`. Not callable. [live-verified]
- **`recompute_project_progress()` callable by anyone** — also **revoked**. [live-verified]
- **`request_cash_payment()` "missing / unauthorized"** — it **exists** in the DB and **does** authorize the caller (`if client_id is distinct from auth.uid() then raise 'Not your invoice'`). Safe. [live-verified]
- **`profiles` "Someone"/placeholder** — fixed today (migration 23). [live-verified]
- **Password 8-vs-12 mismatch** — fixed in code (reset + accept confirm fields), pending web deploy.

---

## 🔴 High (live, worth an evening soon)

1. **Marketplace-customer lockout on core actions** — `contracts_client_sign`, `invoices_client_mark_paid`, `reports_client_ack` all gate `USING` on `tenant_id = current_user_tenant_id()`. A **homeowner marketplace customer has no tenant membership → that's NULL → the check is always false**, so they silently **cannot sign their contract, flag an invoice paid-in-cash, or acknowledge a report**. This is the exact sibling of the profiles bug we just fixed (decisions/variations were already repaired in migration 27; these three were missed). Invited *in-tenant* clients are unaffected, which is why it's been invisible. [live-verified]

2. **`job_requests` base table leaks full PII to every trade** — `job_requests_select` lets any tenant member read **all `status='open'` rows directly**, including `address_line1`, exact `latitude`/`longitude`, and `customer_id`. The privacy-safe `open_jobs_feed` projection exists precisely to avoid this, but the base table is still directly queryable, so a trade can pull every open job's exact address + customer identity before being hired. [live-verified]

3. **Over-broad UPDATE policies — wrong party can edit money/status columns** (RLS can't do column-level, so these need triggers or narrower policies). All [live-verified]:
   - `invoices_client_mark_paid` — `WITH CHECK` only enforces `paid_marked_by = auth.uid()`, so an invited client could set `status='paid'` or change `amount_gbp_pence` directly via the API, not just flag cash.
   - `bids_update_customer` — only checks "it's a bid on my job"; a customer can edit a trade's `amount_pence`/`status`/`message`, not just decline.
   - `bids_update_trade` — only checks tenant match; a trade can flip its own bid to `accepted` or edit a tenant-mate's bid.
   - `contracts_client_sign` / `reports_client_ack` — `WITH CHECK` only pins `signed_by`/`acknowledged_by`, leaving other columns editable while "signing"/"acknowledging".

4. **Review integrity** — `reviews_insert` validates the reviewer is a party to the project but **not** `reviewee_id` or `direction`. A party can attribute a 1–5 rating + text to **any** user id, and by consuming the opposite `direction` slot (unique per project) **block the genuine counter-review**. No "project completed" check either. Reviews are world-readable to any signed-in user. [live-verified]

5. **Mobile: errors masquerade as empty/placeholder data (systemic)** — nearly every data loader does `if (error || !rows) return []` and names fall back to `'Someone'`/`'A builder'`/placeholder profiles (`current-project.tsx:194`). An RLS denial, expired token, or network drop is indistinguishable from "genuinely empty," so permission/outage bugs ship **silently as empty screens or fake data** — this is the root class behind the "Someone"/missing-PM bug and will keep producing look-fine-but-broken screens until loaders surface a real error + retry. [code]

6. **Mobile: `compose-update` post is non-atomic** (`compose-update.tsx:157`) — stage flip → insert update → N photo uploads, no rollback. On flaky site signal a mid-way failure leaves a partial post; the natural retry creates a **duplicate update with duplicate photos**. [code]

7. **Mobile: multi-tenant user locked out** (`tenant-provider.tsx:91`) — `tenant_members … maybeSingle()` **errors** if a user has >1 membership (owner of one + member of another, or two builders), which drops them to the customer shell. Blocks the very multi-tenant case on your roadmap. [code]

---

## 🟠 Medium

- **Estimate preview can disagree with the DB by pence** — Zod allows unbounded-precision `quantity`/`markup_percent` but the DB columns are `numeric(_,2)`, and JS `Math.round` over float64 vs Postgres `round(numeric)` can differ at half-pence. Undermines the "live preview always matches what Postgres stores" guarantee. (`schemas.ts:155/160`, `estimate.ts:40`). [code]
- **`acceptBid` doesn't check `bid.status`** (`marketplace.ts` / `accept-bid/route.ts`) — a customer can "accept" a withdrawn/declined bid, spinning up a project (and consuming the trade's plan slot). [code]
- **Stripe webhook double-email** (`api/webhooks/stripe/route.ts`) — idempotency row inserted after handling; DB writes are guarded but receipt/cancellation **emails can send twice** on retried/concurrent events. [code]
- **Milestone shows paid as owing** (`contracts.ts:93`) — `invoice_status` defaults to `'sent'` when the invoice row is RLS-hidden, so a paid milestone can read as still-owing to a customer. [code]
- **Infinite spinners / silent chat failures** — several customer screens' `load()` has no `catch` (spinner forever on failure); `project-chat` send/attach have no `catch` (failed send looks sent). [code]
- **`SafeAreaView` inside `<Modal>`** (`compose-update.tsx:432`, `decision/[id].tsx`) — Android insets resolve to 0, so modal headers/close buttons can sit under the notch. Confirm a `SafeAreaProvider` is mounted at root. [code]
- **Push deep-links send customers into trade routes** (`_layout.tsx:118`) — a marketplace customer tapping a notification can land on an empty trade-only screen. [code]
- **Stage seeding can crash** (`stages.ts` / `schemas.ts:13`) — `isoDate` validates shape only, so a well-formed but invalid date (`2026-13-99`) passes Zod then throws `RangeError` during stage seeding on project/quote conversion. [code]
- **Marketplace postcode under-validated** (`marketplace.ts:192`) — the UK postcode regex isn't applied, so garbage postcodes degrade the area filter/search. [code]

## 🟡 Low / hardening

- **Enable Supabase "Leaked password protection"** (HaveIBeenPwned) — currently off; one toggle in Auth settings. [advisor]
- **`function_search_path_mutable`** on `touch_updated_at`, `handover_project_id` — set `search_path`. [advisor]
- **Extensions in `public`** (`citext`, `pg_net`) — ideally moved to a separate schema. [advisor]
- **Invoice/quote/variation numbering** sorts by the number *string* and assumes 3-digit padding → ordering breaks past `-999`. [code]
- **`makeAcceptToken` falls back to `Math.random()`** when WebCrypto is absent → guessable quote-accept link token. [code]
- **`gbp(NaN)` → "£NaN"** for any unguarded numeric field. [code]
- **`request_cash_payment` is in the live DB but not in repo migrations** — schema drift; add it so fresh environments match. [live-verified]
- Signup pages missing client-side `minLength` (cosmetic); `budgetLabel` rounds pence; `summariseCosts` accepts unknown category; contact `phone` field unvalidated. [code]
- `onboarding/complete` route is unauthenticated and does a Stripe lookup on an arbitrary `session_id` (limited impact — only mirrors the webhook's write). [code]

## ⚡ Performance (matters as users grow, not urgent)

- **49 RLS policies** re-evaluate `auth.*()`/`current_setting()` **per row** (`auth_rls_initplan`) — wrap calls as `(select auth.uid())` etc. to evaluate once per query. Affects nearly every table. [advisor]
- **48 unindexed foreign keys** — notably `projects.client_id`, `projects.pm_id`, `invoices.project_id`, `messages.project_id/sender_id`, `estimates.project_id`. Add covering indexes. [advisor]
- **150 multiple-permissive-policy overlaps** — the `*_write` (ALL) policies overlap the `*_read` (SELECT) policies on ~25 tables, so both run on every select; consolidate. [advisor]
- **8 unused indexes** (candidates to drop) and **Auth DB connections** set to absolute (10) rather than percentage. [advisor]

---

### Overall

The core tenant model (tenant_id + SECURITY DEFINER helpers + 3-predicate policies) is solid and consistently applied, and the genuinely dangerous cross-tenant items the automated pass raised turned out to be already closed in production. The **real, live** work clusters in two places: (1) the **marketplace-customer "no tenant" lockouts** on contracts/invoices/reports — the direct siblings of the bug just fixed — and (2) **column-level write integrity** on the newer marketplace/payment policies (invoices, bids, reviews). On the client side, the **error-swallowing/placeholder pattern** in the mobile app is the thing most likely to keep producing "looks fine but is broken" reports, so making loads fail loudly with retry is the highest-leverage reliability fix.

---

# Visual / UI audit (added same day)

Method: live browser screenshots of the public site at desktop + mobile (375px), plus full code-level UI reviews of web and mobile.

## ✅ Verified good (live)
- Homepage (desktop + mobile): hero, nav, mobile hamburger, CTAs, app-store badges — all clean and responsive.
- `/homeowners` (mobile): correct, no "free" wording ("No obligation").
- `/signup`: tradesperson/homeowner toggle works; homeowner side correctly shows "No subscription, no card" with no plan/price; both password fields read "At least 8 characters" (today's fix is live-consistent in copy).
- Tenant logo slots (web `tenant-header`, `q/[token]`) use `h-10 w-auto max-w-* object-contain` + initials fallback — no squish/empty. Mobile safe-area is now provider-backed and consistent; the old job-detail top cut-off is genuinely fixed.

## 🔴 High (user-visible)
- **Null date renders "01 Jan 1970"** — `format.ts` `formatDate(null)` hits the Unix epoch, not NaN, so the guard never fires. Shows on project, dashboard and customer-portal screens ("Started 01 Jan 1970", "est. completion 01 Jan 1970"). [web]
- **Placeholder names leak to users (both apps)** — "Someone", "—", "PM", "Project manager", "A trade", "Your builder", "Unknown" render as if real whenever a profile/name is missing or was RLS-hidden. Today's RLS fix restores real PM names, but these fallback strings still show for genuinely-missing data and would re-leak on any future RLS regression. Replace with honest empty/error states. [web + mobile]
- **Keyboard covers bid + variation-approve forms (mobile)** — `find-work/[id]` bid form and `customer/project/[id]` approve-&-sign form have no `KeyboardAvoidingView`; the keyboard hides the lower fields and the Submit/Approve button. [mobile]
- **Chat input/Send under the home indicator (mobile)** — `marketplace-thread` / `project-chat` use `edges={['top']}` with no bottom inset; input bar sits under the iPhone home indicator. [mobile]

## 🟠 Medium
- **Customer `/me` top bar has no hamburger** — logo + 4 links + "Post a job" wrap to 2–3 cramped rows on a phone (trade side got a menu, customer side didn't). [web]
- **Chat fixed height** `h-[calc(100vh-9rem)]` vs `-10rem` (the two chat pages disagree) can push the input off-screen, especially with the wrapping `/me` header. [web]
- **Chat bubbles lack `break-words`** — a long URL overflows and causes horizontal scroll. [web]
- **Onboarding branding preview** forces the logo into a 36×36 square (misrepresents the real header; may make a fine logo look broken and prompt a re-crop). [web]
- **Mobile logo box fixed 150×34** letterboxes a square/tall logo into a thin strip (tiny). [mobile]
- **`load()` with no catch** → permanent spinner on failure (several mobile customer screens + a couple web chat pages). [both]
- **Aggressive money rounding** — dashboard `compactGbp` shows £1,500 as "£2k"; `budgetLabel` drops pence. [web]

## 🟡 Low
Mobile-menu backdrop `top-[57px]` vs ~64px header; double horizontal padding on chat pages; invoice/quote numbering sorts by string (breaks past 999); status-pill colour same for all statuses; customer avatar has no `onError` fallback; tab bar uses hardcoded insets (not `insets.bottom`); global `StatusBar style="dark"` not theme-aware; job photos `object-cover` crop. [mostly mobile]

### Visual verdict
The public/marketing/auth surface is in good standing — verified live, responsive, on-brand, no "free"-wording leaks. The real visual risks are data-edge regressions (null-date "1970", placeholder names) and a mobile forms/keyboard + chat-inset cluster — all concrete and fixable, none breaking the core happy path.
