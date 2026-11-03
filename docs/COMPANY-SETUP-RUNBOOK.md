# Builders Ready Ltd — Setup & Migration Runbook

_Last updated: 1 Nov 2026. Owner: Oddie._
_Not legal or accounting advice — confirm the tax/legal specifics with your accountant/solicitor. This is the practical order of operations._

**Status key:** ✔ done · ⏳ in progress / drafted, awaiting action · 🔒 blocked (waiting on something) · ◻ not started

---

## Where we've got to (snapshot)

**Done:** Ltd incorporated (company number in hand) · Tide business account open · Stripe fully migrated to its own Builders Ready Ltd account (subscriptions, client payments and builder payouts all live) · all core infrastructure moved under the company (Vercel, Supabase, Stripe, Resend, Google Workspace, domains) with billing on Tide · Vercel/Supabase integration ownership transferred to info@buildersready.uk after the old owner was removed · IP-assignment deed and director's loan agreement drafted and ready to sign.

**Still outstanding (the real to-do list):**
1. ◻ Pick an accountant + set up bookkeeping + open the Director's Loan Account
2. ⏳ Sign the IP-assignment deed and director's loan agreement (drafts ready)
3. ◻ **Trademark** the name (slow — ~4 months — worth starting)
4. ◻ **ICO registration** (10 mins, legally required)
5. ◻ Terms of Service + Privacy Policy renamed to the Ltd
6. ◻ Company details (name/number/office) in website + email footers
7. ◻ Business insurance (PI + cyber + public liability)
8. 🔒 Apple Developer → company account (waiting on D-U-N-S number)
9. ◻ Google Play account → company
10. ⏳ Finish the last old-Stripe bits: migrate Balraj's sub + cancel the 2 old subs
11. ◻ Strategy docs: business plan, finalise roadmap, marketing plan, finish website redesign

Have these to hand for almost every step: **company number, registered office address, date of incorporation, certificate of incorporation (PDF), Tide account + sort code/account number.**

Legend: **[YOU]** = you do it · **[ME]** = I produce it for you · **[ACCT]** = with your accountant.

---

## STAGE 1 — Finances clean from day one

### 1. Accountant + bookkeeping + Director's Loan Account  ◻ [YOU/ACCT]
1. Pick an accountant (fixed monthly fee covering year-end accounts, Corporation Tax, confirmation statement; many do startups for ~£50–120/mo).
2. Set up bookkeeping (Xero or FreeAgent — FreeAgent is free with some bank accounts, check Tide).
3. Connect the Tide account as a bank feed.
4. Ask them to open a **Director's Loan Account** so your £1,000/month top-ups post there (reference every transfer "Director's loan").
5. Confirm **Corporation Tax** is registered with HMRC (often auto on incorporation; if not, register within 3 months of trading).

### 2. Director's loan agreement  ✔ drafted — ⏳ sign [ME → YOU sign]
- Draft produced: `docs/legal/directors-loan-agreement.md` (+ .docx to print). Fill the `[…]` fields, sign, keep on file; post the monthly £1,000 to the DLA.

---

## STAGE 2 — Protect the asset (do early; trademark takes months)

### 3. IP-assignment deed  ✔ drafted — ⏳ sign [ME → YOU sign]
- Draft produced: `docs/legal/ip-assignment-deed.md` (+ .docx). Fill fields, sign as a deed with a witness, keep the PDF.
- Asset ownership now actually under the company (not just on paper): ✔ domains, ✔ Supabase, ✔ Vercel, ✔ Stripe, ✔ Resend, ✔ Google Workspace. Still personal: code repo (GitHub, under info@houseofplanning.co — fine for now, move to a company org before any funding round) and app-store accounts (Stage 4).

### 4. Trademark the name  ◻ [YOU — worth starting now]
1. Search the name on the UK IPO register first (gov.uk → "Search for a trade mark").
2. Apply at gov.uk → "Register a trade mark." Owner = **Builders Ready Ltd**.
3. Classes: **9** (software/app), **42** (SaaS), **35** (online marketplace). ~£205 first class + £60 each extra.
4. Takes ~4 months; just needs starting. I can prep the exact class wording + a clearance check.

---

## STAGE 3 — Compliance + move the business onto the company

### 5. ICO registration (data protection fee)  ◻ [YOU]
- Register at ico.org.uk → "Pay the data protection fee." ~£40–60/yr. Required because you process personal data. 10 minutes.

### 6. Terms of Service + Privacy Policy named to the Ltd  ◻ [ME]
- Update both to name **Builders Ready Ltd** as entity/data controller, with company number + registered office. Sets out the processor/controller split for builders' client data.

### 7. Company details on the website + emails  ◻ [ME]
- Legal requirement for a Ltd: show registered company name, number, country of registration and registered office in the website footer and email footers. I add these next deploy.

### 8. Insurance  ◻ [YOU]
- Quotes for **professional indemnity** + **cyber** + **public liability** (Superscript, Hiscox, Simply Business cover SaaS). Not mandatory but sensible given you hold data and touch payments.

### 9. Move subscriptions / direct debits to the company  ✔ (mostly) [YOU]
- ✔ Done: Vercel, Supabase, Stripe, Resend, Google Workspace, domains (bought via Vercel → bill to business automatically).
- 🔒 Apple dev fee — moves with the account (waiting on D-U-N-S).
- Future: Expo/EAS is on the **free** tier (nothing to pay); move to a company Expo org later. Claude subscription → move to business (genuine expense).
- ◻ Not used: AI/LLM API, Canva, social-scheduling tool.
- Live status: `docs/direct-debits-to-move.md`.

---

## STAGE 4 — Asset migration (the careful bit)

### 10. Stripe → Builders Ready Ltd  ✔ done (⏳ last bits) [YOU + ME]
- New Builders Ready Ltd Stripe account is live and running everything: subscriptions, client payments, builder-payout onboarding. API on 2025-03-31.basil; Managed Payments off; automatic_tax off (not VAT-registered yet); Connect on the modern controller/managed-risk config; webhook at buildersready.uk/api/webhooks/stripe; 6 price IDs set.
- ⏳ Remaining: 2 of 3 old subscribers re-created on the new account (Stephen, ltroofing); **Balraj still to migrate** (pays via "OneLink" — needs his payment-method type). Then **cancel the 2 old subscriptions** on the old account at end of billing period.

### 11. App-store accounts → the company  🔒/◻ [YOU — plan, don't rush]
- **Apple** 🔒: needs an **Apple Developer organisation account** (requires the Ltd's **D-U-N-S number** — free, ~1–2 weeks), then transfer the app to it. Blocked until the D-U-N-S arrives.
- **Google Play** ◻: update the developer account's legal details to the Ltd, or use Play's app-transfer process (form + small fee).
- Fiddliest migration, not urgent for running the business. Verify current steps on each platform's help pages before starting.

---

## STAGE 5 — Strategy & growth (parallel track — doesn't block Stages 1–4)

12. **Business Plan** ◻ [ME] — draftable from everything built (model, market, roadmap, traction).
13. **Roadmap / features plan** ⏳ [ME] — `docs/ROADMAP.md` started; refine and finalise.
14. **Marketing Plan** ◻ [ME] — channels, cadence, the homeowner-acquisition gap, content engine.
15. **Site branding + website + marketing material** ⏳ [ME] — redesign in progress (`docs/WEBSITE-DESIGN.md`); parked mid-iteration.

---

## Suggested next moves
- **Trademark** (2.4) and **ICO** (3.5) — start both; one is 10 minutes, the other takes months.
- Chase the **D-U-N-S number** so Apple (4.11) unblocks.
- Sign the **IP-assignment deed** and **director's loan agreement** (drafts ready).
- Finish **Balraj's Stripe migration** + cancel the 2 old subs (10).
- Pick an **accountant** so bookkeeping + the DLA are clean from the start (1).

## Annual, don't forget
- Confirmation statement (once a year).
- Accounts + Corporation Tax (your accountant).
- ICO fee renewal.
- Trademark renewal (every 10 years).
