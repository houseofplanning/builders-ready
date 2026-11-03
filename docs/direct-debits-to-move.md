# Recurring payments / accounts to move onto the Tide (Builders Ready Ltd) account

_Last updated: 1 Nov 2026._
_Goal: every recurring business cost pays from the company card, and ideally the account is owned under the company email (**info@buildersready.uk**). Most of these are card subscriptions, not bank direct debits; same idea, just update the card on file and, where possible, the account owner._

## Core infrastructure — status
| Service | What it's for | Status |
|---|---|---|
| **Vercel** | Website + app hosting | ✔ Done — under info@buildersready.uk, billing on Tide |
| **Supabase** | Database / backend / auth | ✔ Done — under info@buildersready.uk, billing on Tide |
| **Stripe** | Payments (subscriptions + client payments + builder payouts) | ✔ Done — own Builders Ready Ltd account, payouts to Tide |
| **Resend** | Transactional emails (quotes, invoices, letters) | ✔ Done — under info@buildersready.uk, billing on Tide |
| **Google Workspace** | Business email (info@buildersready.uk) | ✔ Done — under info@buildersready.uk, billing on Tide |
| **Domains** (buildersready.uk, shtrades.co) | Website / app domains | ✔ Done — bought via Vercel, so charged to the business account automatically |

## Still to move — but not now
| Service | What it's for | Status / action |
|---|---|---|
| **Apple Developer Program** | iOS app on the App Store | Needs to move to the company — **waiting on the D-U-N-S number** for the Ltd (required for an Apple organisation account). Blocked until that comes through. £79/yr |
| **Expo / EAS** | Mobile app builds + OTA updates | Currently **Free tier (not paying)** under the personal Expo account `oddiemehraj`. **Future job, not now:** when/if it goes paid, move billing to Tide and transfer the EAS project into a company-owned Expo organisation |
| **GitHub** | Code repository (the core IP asset) | Sits under Oddie's personal **info@houseofplanning.co** account. Fine for day-to-day. **Future job:** before any funding round, create a company-owned GitHub organisation and transfer the repo in |

## Claude (AI assistant) — decision
- **Move to the business.** Majority business use (running Builders Ready — features, marketing, admin), so a genuine allowable expense. Pay from Tide, keep the invoice, ideally put the account under info@buildersready.uk, and flag to the accountant. (Not an app dependency — this is Oddie's working subscription.)

## Confirmed NOT used — nothing to move
- **AI / LLM API** — the app does not call one.
- **Canva / design tools** — not used.
- **Social scheduling tool** — not used.

## Not direct debits — just so you know
- **Google Play Developer** — a one-off $25 already paid, nothing recurring.
- **Tide** — the bank itself; check whether your plan has a monthly fee (some do).

## Soon, once set up
- **Accounting software** (Xero / FreeAgent) — on the company card from the start.
- **Business insurance** (PI / cyber / public liability) — once you've chosen a provider.

---

### How to move one
1. Log into the service.
2. Go to Billing / Payment method / Subscription.
3. Replace the card with your **Tide** business card.
4. Where supported, move **account ownership** to **info@buildersready.uk** so it's the company's.
5. Update the status above.

_Add any services spotted on the old personal card/bank statement as recurring charges._
