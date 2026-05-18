# Builders Ready — Deliverable 4: Pricing Structure

**Status:** ✅ Finalised. Pricing confirmed 2026-05-18.
**Date:** 18 May 2026
**Confirmed by user 2026-05-18:** three tiers, gated by active project count, hard block at limit, card upfront, 14-day trial, **£29 / £69 / £149 monthly**.

---

## 0. What's locked

| Element | Status |
|---|---|
| Number of tiers | **3** ✅ |
| Gating mechanism | Active project count (status in `active` or `on_hold`) ✅ |
| Tier 1 cap | Up to 10 active projects ✅ |
| Tier 2 cap | Up to 50 active projects ✅ |
| Tier 3 cap | Unlimited ✅ |
| Trial | 14 days, card upfront, auto-bill on day 15 unless cancelled ✅ |
| Behaviour at limit | Hard block on the (limit+1)th project, with "upgrade your plan" CTA + "archive a finished project" escape hatch ✅ |
| **Monthly prices** | **£29 / £69 / £149 (excl. VAT)** ✅ |
| Annual billing discount | 20% (10 months for the price of 12) ✅ |
| VAT | Prices quoted excl. VAT; Stripe Tax calculates on top |

---

## 1. Tiers

| Tier | Active projects | Monthly | Annual (£/mo equiv.) | Annual total |
|---|---|---|---|---|
| **Starter** | up to 10 | **£29** | £23 | £276/yr |
| **Pro** | up to 50 | **£69** | £55 | £660/yr |
| **Unlimited** | unlimited | **£149** | £119 | £1,428/yr |

All prices excl. VAT. Tier names locked as Starter / Pro / Unlimited unless the user signals otherwise.

---

## 2. What's included in every tier

Identical across Starter → Unlimited — the only differentiator is active-project count. The product **a five-project builder gets** is the **product a fifty-project builder gets**.

Included at every tier:

- Unlimited users — owner, project managers, clients. **No per-seat charge.**
- Unlimited photo storage (soft 25 GB/tenant cap; auto-tier-up email if exceeded).
- Unlimited PDF reports.
- Branded mobile + web experience — logo, brand colours, business name visible to the builder's clients.
- Push notifications (Expo Push, no per-message charge).
- Decisions inbox.
- Variations / change orders with audit trail.
- Project finance summary card (project value, invoiced, variations, outstanding).
- Invoice tracker with bank-transfer recording (no card surcharge; no Stripe Connect in v1).
- UK English + £ GBP throughout.
- Email support.
- GDPR-compliant data export on request.

**Deliberately not differentiated by tier in v1:** API access, white-labelling on the App Store, custom domains, advanced analytics, SSO, audit-log retention. (These either don't exist in v1 or are universal.)

If we add an enterprise tier later (£300+/mo), the differentiators would be: dedicated CSM, phone support, quarterly review calls, SLA. Not v1.

---

## 3. Trial mechanics

**14 days from signup, card upfront** (confirmed). Stripe `payment_behavior: default_incomplete` collects the card during the signup flow; first charge fires automatically on day 15 unless the builder cancels.

Why 14 not 30: a builder evaluates a portal by running one live project through it. 14 days is enough to feel real value without dragging. Industry data: 14-day trials with a card on file convert 5-8× better than 30-day trials without a card in B2B SaaS.

Trial-ending notifications (handled by Stripe webhook `customer.subscription.trial_will_end`):

- **Day 11 (3 days before end):** email — "your trial ends in 3 days; first invoice will be £X."
- **Day 14:** email — "your trial ends today" (final reminder).
- **Day 15:** auto-charge; receipt email from Stripe.

Cancellation: self-service via Stripe Customer Portal (linked from `app.buildersready.uk/<slug>/settings/billing`). 7-day grace period after cancellation before tenant data goes read-only; 30 more days before tenant.status = 'archived'. Data export remains available throughout.

Mid-cycle upgrade: prorated immediately (Stripe handles this natively). Mid-cycle downgrade: takes effect at the next renewal; existing projects keep running, but the builder can't create new ones beyond the downgraded tier's cap.

---

## 4. Hard-block at project limit (confirmed)

When a Starter builder tries to create their 11th active project, the DB trigger (`enforce_project_limit`) rejects the insert and the admin console catches the exception with an upgrade modal:

```
You've reached your plan's project limit

Starter plans include up to 10 active projects.
You currently have 10 active projects.

[ Upgrade to Pro — £49.99/mo ]    [ Archive a finished project instead ]
```

The "archive a finished project" CTA is important — it gives a no-cost escape for builders who simply forgot to close out a completed job. Archiving drops the project out of `status in ('active','on_hold')` and frees a slot.

---

## 5. Notable decisions

- **No per-seat pricing.** Builders inviting their PMs and clients is the product's flywheel — charging per seat would punish that.
- **No setup or onboarding fees.** The onboarding wizard does the setup; charging for it signals "this is hard to use alone," which is the opposite of the message we want.
- **No per-client charges.** Builders invite their own clients; charging per client invites the wrong incentive (builders stop inviting, the differentiator dies).
- **Storage soft cap, not metered.** A 25 GB/tenant soft cap with a polite email if exceeded is cleaner than charging £X/GB. Photos at our compression averaged ~250 KB in the Regal precedent — 25 GB ≈ 100,000 photos per tenant. Almost no one hits it.

---

## 6. What goes on the marketing pricing page

Block at the bottom of the landing page and on a dedicated `/pricing` route:

```
                  STARTER          PRO              UNLIMITED
                  £29 / mo         £69 / mo         £149 / mo
                  up to 10         up to 50         unlimited
                  active           active           active
                  projects         projects         projects

                  [ Start free trial ]      same CTA on all three
                  14 days free · Card required · Cancel anytime
                  Annual billing saves 20% · All prices excl. VAT
```

A small "everything's included at every tier — pricing scales by project count, not features" note below the table.

---

## 7. Stripe Products / Prices to create

When you're ready to wire up Stripe in the dashboard, create **one Product** ("Builders Ready Subscription") with **six Prices**:

| Price ID env var | Tier | Cadence | Amount |
|---|---|---|---|
| STRIPE_PRICE_STARTER_MONTHLY | Starter | Monthly | £29.00 |
| STRIPE_PRICE_STARTER_ANNUAL | Starter | Annual | £276.00 |
| STRIPE_PRICE_PRO_MONTHLY | Pro | Monthly | £69.00 |
| STRIPE_PRICE_PRO_ANNUAL | Pro | Annual | £660.00 |
| STRIPE_PRICE_UNLIMITED_MONTHLY | Unlimited | Monthly | £149.00 |
| STRIPE_PRICE_UNLIMITED_ANNUAL | Unlimited | Annual | £1,428.00 |

All in GBP. Tax behaviour: **exclusive** (Stripe Tax adds 20% VAT on top for UK B2B). Statement descriptor on the parent Product: **BUILDERS READY**.
