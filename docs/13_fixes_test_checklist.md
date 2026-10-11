# Builders Ready — test checklist for this fix batch

**Date:** 2026-10-10
How to use: deploy per the three groups below, then walk each row and tick it. "Where" is for reference; "Test" is what to do; "Expect" is what good looks like. All code type-checks clean (shared + mobile `tsc` exit 0; web validated on the Vercel build).

---

## Deploy order
1. **Already live (database)** — the profile/PM-name fix was applied straight to Supabase; nothing to deploy. Just test.
2. **Web** — from the **repo root**: `vercel --prod`. Covers the password confirm-field fix + visual web fixes + the shared date fix (web half).
3. **Mobile (OTA)** — `npx eas-cli@latest update --branch production`. Covers the mobile visual fixes + the shared date fix (mobile half).

> The shared date fix (V1) lives in `packages/shared`, so it only fully ships once **both** web and mobile are deployed.

---

## A. Already live — database (test now, no deploy)

| # | Where | Test | Expect |
|---|-------|------|--------|
| A1 | Project messages / project header (app + web) | Sign in as an **invited client** and open your project + messages | PM's **real name** shows (not "Project manager"/"Someone") |
| A2 | Same, as a **marketplace customer** (hired a trade) | Open the project + chat | Trade/PM real name shows; you can read it |
| A3 | Isolation sanity | As a client of builder A, you still only see your own project people | No one from another builder is visible |

## B. Web (after `vercel --prod`)

| # | Where | Test | Expect |
|---|-------|------|--------|
| B1 | Password reset + invite accept | Reset your password using an **8-character** password; confirm field | Accepts 8 chars — no "needs 12" popup |
| B2 | Dates (V1) | Open a project/dashboard/customer job with a **missing** date | Shows "—", **not** "01 Jan 1970" |
| B3 | `/me` header (V6) | Open the customer area on a **phone** (or narrow the window) | Logo + "Post a job" on top row; nav on its own tidy scrollable row — no cramped wrapping |
| B4 | Chat (V7) | Open a message thread on a phone; send a very long URL with no spaces | Input stays visible at the bottom; the long URL **wraps** inside the bubble (no sideways scroll) |
| B5 | Onboarding branding preview (V8) | Onboarding → branding, upload a **wide** logo | Preview shows the logo at proper size/aspect (not squished into a tiny square) |
| B6 | Dashboard money (V10) | Look at the KPI tiles / margin figures | £1,500 reads "£1.5k" (not "£2k"); under £1k shows the exact amount |

## C. Mobile (after EAS OTA — reopen the app)

| # | Where | Test | Expect |
|---|-------|------|--------|
| C1 | Dates (V1) | Any screen with a missing date (e.g. a project with no end date) | Shows "—", not "01 Jan 1970" |
| C2 | Client home PM card (V3) | Client home when the PM name is present / absent | With a name: "John Smith" + "Project Manager". If absent: just "Your project manager" (no duplicated/broken "Project manager / Project Manager") |
| C3 | Chat headers (V3) | Open project/marketplace chat | Header reads the real name, or a clean "your project manager"/"the client" in the sentence — never a fake name |
| C4 | Bid form keyboard (V4) | Find Work → open a job → start filling the **bid** form; tap the lower fields | Keyboard does **not** cover the fields or the "Submit bid" button; you can scroll/reach them |
| C5 | Variation approve keyboard (V4) | Customer project → approve & sign a **variation** | Keyboard doesn't hide the name field or the "Approve & sign" button |
| C6 | Chat input inset (V5) | Open project + marketplace chat on an iPhone with a home indicator | The message input / Send bar sits **above** the home indicator (not under it) |
| C7 | No infinite spinner (V11) | Turn on airplane mode, then open customer home / a customer project / a Find Work job | Spinner **resolves** (doesn't hang forever); pull-to-refresh retries once back online |
| C8 | Avatar fallback (V12) | Customer account with a broken/old profile photo URL | Shows your **initials** circle instead of a blank circle |

---

## Not changed (deliberately) — so you don't go looking
- **Mobile logo (V9):** already uses aspect-preserving `contain` sizing — fine as-is; the real squish was the web preview (B5).
- **Web placeholder names (V2):** after the RLS fix, real names resolve; the remaining fallbacks ("—", "A trade") are neutral, not broken. Left as-is.
- **Low cosmetic (V12 remainder):** tab-bar bottom insets on some Android gesture devices, status-pill colour per status, mobile-menu backdrop offset — noted, not changed, to avoid churn on live.

## Regression spot-checks (quick, after both deploys)
- Builder: create a quote → send → (client signs) → raise an invoice → mark paid. No layout breakage.
- Customer: post a job → see it in the marketplace → message a trade. Dates/money read correctly.
- Logos: builder header on web + app still shows the tenant logo correctly (unchanged, but confirm).

---

# D. High logic cluster (DATABASE — already live, no deploy)

Applied straight to Supabase (migration `20260519000028_client_write_guards.sql`), like the earlier profile fix — so it's **in effect now**. It only blocks tampering; all legitimate paths were verified in rolled-back transactions against live data. Test to confirm nothing feels different for real users.

| # | Where | Test | Expect |
|---|-------|------|--------|
| D1 | Contract signing (marketplace customer) | As a **marketplace customer** (hired via the marketplace, no builder login), open a contract the builder sent and sign it | Signs successfully (previously silently blocked) |
| D2 | Report acknowledge (marketplace customer) | As a marketplace customer, acknowledge a report | Works (previously blocked) |
| D3 | Invited-client flows unchanged | As an **invited client**, sign a contract / acknowledge a report / decide a variation / mark an invoice paid | All still work exactly as before |
| D4 | Hiring still works | As a **customer**, accept a bid → a project is created | Works (service-role path unaffected — verified) |
| D5 | Decline / withdraw | Customer declines a bid; trade withdraws its own bid | Both work |
| D6 | Builder (owner/PM) edits | Owner/PM edits invoice amount, contract sum, variation delta, etc. | All still work — guards only apply to the client/customer/trade, not staff |

What these guards now prevent (defence-in-depth; not user-facing, but good to know): a client can no longer change an invoice amount/status (only mark paid), a contract's sum/terms (only sign), or a variation/decision's money/title (only decide); a customer can only *decline* a bid (not edit its amount/status); a trade can only *withdraw* or attach a quote to its own bid (not self-accept or change its amount).

**Deferred (not changed): L3 job_requests address/geo** — those columns are currently empty (the post-a-job form collects only city/postcode), so there's no live exposure; the proper fix is app-side and tracked for later.

### Suggested re-run after everything's deployed
Run the Supabase **security advisor** again once the web deploy is out, to confirm no new warnings from the added functions. (The guard trigger functions aren't callable via the API; `acting_as_client` had its execute grant revoked.)

---

# E. Medium / Low logic findings

Code fixes go out with the **same** web (`vercel --prod`) and mobile (EAS OTA) deploys as the visual batch; the DB `search_path` hardening is **already live**.

| # | Where | Test | Expect |
|---|-------|------|--------|
| E1 | Estimate totals (shared → web+app) | Build a quote with an odd quantity/markup (e.g. 2.5 × something, 17.5% markup) | The app's total equals the saved total exactly — no sub-penny drift between preview and what's stored |
| E2 | Post a job — postcode (app+web) | Try to post a job with a junk "postcode" like `LONDON` | Rejected with "Enter a valid UK postcode"; a real postcode (e.g. `SW19 2AB`) works and shows under the right area filter |
| E3 | Date inputs (shared) | (Edge) any date field | A valid date works; an impossible date can't slip through to crash stage seeding |
| E4 | Accept a bid (web) | As a customer, try to accept a bid the trade **withdrew** (or that was already accepted) | "This bid is no longer available" — no phantom project created |
| E5 | Stripe emails (web) | Normal card/cash payment | Exactly **one** receipt email (no duplicates on Stripe retries) — and payments still reconcile |
| E6 | Contract milestones (app) | Open a signed contract's payment schedule | A paid milestone never wrongly reads as still owing |
| E7 | Money display (shared) | Anywhere money shows | Never shows "£NaN" |
| E8 | Invoice/quote/variation numbers (app) | Raise invoices/quotes/variations | Numbers increment correctly (no repeats; correct even past -999) |

## Deferred / documented (not changed this pass)
- **Accept-link token CSPRNG** — `makeAcceptToken` prefers WebCrypto but can fall back to `Math.random` on a runtime without it. Proper fix adds `expo-crypto` (a native module → needs a new binary build, not an OTA). Verify `global.crypto.getRandomValues` exists on device; otherwise add `expo-crypto` next binary build.
- **Leaked-password protection** — enable in Supabase Auth settings (one toggle; checks HaveIBeenPwned).
- **Schema drift** — `request_cash_payment`, `invoices.cash_requested_at`, `invoices.paid_via`, and some feed columns exist in the live DB but not in committed migrations. No live impact; reconcile into migration files so a fresh dev/staging env matches prod.
- **Performance (separate pass, not urgent at current scale):** 48 unindexed foreign keys, 49 RLS policies re-evaluating `auth.*()` per row, overlapping permissive policies, a few unused indexes. Worth doing before the user base grows.
- **`budgetLabel`** rounds to whole pounds — fine for whole-pound budgets; left as-is.

---

# F. Post-deploy re-audit — follow-up fixes (2026-10-11)

Re-ran the Supabase advisors, a live site look, and fresh DB/web/mobile re-audits. Confirmed the deployed fixes are correct with no regressions. New real items found and fixed below. (Two "HIGH"s the automated pass raised — the `project_finance` view leak and `send_push` being open — were **re-verified false against the live DB**: the view has `security_invoker=on`, and `send_push` execute is already revoked.)

**DB — already live (no deploy):**
| # | What | Test | Expect |
|---|------|------|--------|
| F1 | Marketplace customer can download **report PDFs** | As a marketplace customer, open a report on your project and download it | Downloads (was silently blocked — tenant-prefix storage rule) |
| F2 | Marketplace customer can download **project documents** | Same, for a shared document | Downloads |
| F3 | Column guards still hold | Re-run the client-tamper test (change a decision title while deciding) | Title unchanged, decision still recorded (verified) |
| F4 | Owner/PM unaffected | Owner/PM edits an invoice/contract on their own project | Works (gate now keys on the project's own tenant) |

*(Also: `other_party_on_project` is no longer callable via the API — minor info-leak closed. `handovers` and `update-photos` were already fine, no change needed.)*

**Web — needs the next `vercel --prod`:**
| # | What | Test | Expect |
|---|------|------|--------|
| F5 | **Mobile** accept-bid guard (the fix was only on the web path before) | From the app, try to accept a bid the trade withdrew | "This bid is no longer available" |
| F6 | Web invoice/quote numbering | (Edge) raise invoices/quotes | Numbers never repeat, correct past -999 (now matches the mobile fix) |

**Repo hygiene (no runtime impact):** renamed a duplicate `...023` migration so a fresh `supabase db push` can't skip one.

**Still deferred (unchanged):** expo-crypto accept-token (native rebuild), enable leaked-password protection (toggle), extensions-in-public (low), schema-drift reconciliation (cash columns / `mp_job_customer` / `request_cash_payment` live-only), acceptBid double-tap TOCTOU race (low, pre-existing), performance pass (when users grow).

---

# G. Quote "Send" didn't email the client (the big one)

**What was wrong:** on the **app**, sending a quote only marked it "sent" and opened the phone's native **Share** sheet (WhatsApp/email picker) — it never emailed the address you entered, yet the quote showed "sent". The **web** send already did the full job (render PDF → mark sent → email via Resend); the app was missing the email entirely.

**Fix:** new authenticated endpoint `POST /api/estimates/send` that does exactly what the web send does — renders the branded PDF, stamps the quote sent, and **emails the client via Resend with the PDF attached**. The app's "Send" now calls it, and only marks "sent" when the server actually succeeds. If a quote has no client email on file, it falls back to the Share sheet (so you can still send the link manually). Also removed the app's weak client-side link-token generator (the server now mints the token securely).

**Needs BOTH deploys** (web route + app OTA).

| # | Where | Test | Expect |
|---|-------|------|--------|
| G1 | App → a quote **with** a client email | Hit Send | Alert "Quote sent — Emailed to <address>"; the email (with PDF) lands in that inbox; quote shows "sent" |
| G2 | The quote you sent earlier | Open it and hit Send again | It re-sends and now actually emails (re-sending is allowed; the link stays the same) |
| G3 | App → a quote with **no** client email | Hit Send | Falls back to the Share sheet (no silent "sent"-without-email) |
| G4 | Web send still works | Send a quote from the website | Client still receives the email (unchanged) |

Note: this relies on the same Resend setup the web already uses (so it's configured). If an email ever fails to send, the quote is still marked sent and the error is logged — same behaviour as the web.

---

# H. Back button jumped to home (app navigation) — mobile OTA only

**What was wrong:** the root auth gate re-ran on every navigation and redirected a customer to `/customer` whenever the screen's top-level route group wasn't exactly `customer`. Shared detail screens (messages, marketplace job, bids, threads) live outside the `customer/` folder, so opening them collapsed the back stack — "back" went all the way to home/marketplace instead of the previous screen.

**Fix:** the gate now only bounces a user when they're in the *wrong shell home* (customer in the trade `(tabs)`, or trade in `customer`), not when they're on a shared detail route. Builder side verified unaffected.

| # | Where | Test | Expect |
|---|-------|------|--------|
| H1 | Customer → Messages → a thread → Back | | Returns to the message list, not home |
| H2 | Customer → Marketplace/job → bids → Back | | Returns to the job, then the list — one step at a time |
| H3 | Builder → Marketplace → job → bids → Back | | Same correct step-back behaviour |
| H4 | Shell separation still holds | Customer can't land in the trade tabs; trade can't land in the customer area | Still bounced correctly |

---

# I. Public quote: Accept/Decline + "create a free account to follow your project" (web)

Two parts, both web — ship with `vercel --prod`:

**(a) `/q/<token>` is now public** (added `q` to the middleware + shared reserved lists) — a prospect with no account opens the link and sees the quote, no sign-in wall.

**(b) New accept flow on the quote page:**
- Clear **Accept** / **Decline** buttons (type name to sign on Accept; Decline notifies the builder).
- After **Accept**, an explicit panel: *"Follow your project — create a free account … It's free, and no card is needed."* with name/email (pre-filled)/password.
- Creating the account **links the project to them immediately** (no builder re-invite): it ensures a project exists for the quote and sets its client to the new account, then signs them in and drops them at **/me**. If the quote was already converted by the builder, it just re-points that project's client to them (idempotent).

| # | Where | Test | Expect |
|---|-------|------|--------|
| I1 | Quote link, logged out | Open `/q/<token>` in an incognito window | Quote shows (not the sign-in page) |
| I2 | Accept | Type name → Accept | "Quote accepted", builder notified, then the "create a free account" panel |
| I3 | Create account | Fill name/email/password → Create account | Lands on /me signed in, with the project already there — builder didn't have to invite |
| I4 | Decline | Hit Decline → confirm | "Quote declined", quote marked declined |
| I5 | Builder side | After the client self-signs-up, open the project as the builder | The project's client is the real person (not the owner placeholder); no re-invite needed |
| I6 | Existing email | Use an email that already has an account | Told to sign in; the project is still linked to that account |
| I7 | No thanks | Accept, then "No thanks" | Shows the plain "accepted" confirmation (no account made) |

Notes: no card is ever requested (customer accounts are free, no Stripe). If the builder is at their project-plan limit, the client is told the builder will add them once a slot frees up (account not created in that case).
