# Builders Ready — Deliverable 6: Accounts & Services Checklist

**Status:** Draft for your review. Mirrors Regal's `02_account_setup_checklist.md` style; lists *only* the accounts that are new or separate-from-Regal.
**Date:** 18 May 2026
**Tone-setter:** start the slow ones (trademark check, Apple Dev if separate) as soon as you sign off the brief — they have multi-day verification tails.

---

## 0. Order of operations

Critical-path summary so you can sequence:

| # | Account | Time | Cost | Why early? |
|---|---|---|---|---|
| 1 | Trademark search | 30 min today | Free | Confirms the name is safe before you put anything else on it. |
| 2 | Domain | 10 min | ~£15/yr | Needs to be in hand before signup/onboarding URLs are wired. |
| 3 | GitHub repo | 5 min | Free | Sprint 0 Day 1 commit target. |
| 4 | Supabase org + 1 project | 10 min | Free → ~$25/mo at launch | Blocks all backend work. |
| 5 | Stripe | 30 min + 1-3 days | Free until first charge | Verification takes time. |
| 6 | Resend | 10 min + DNS | Free → $20/mo | Needs DNS records to verify; do early. |
| 7 | Vercel project | 5 min | Existing account ($20/mo) | Marketing deploy from week 1. |
| 8 | Expo org + EAS | 5 min | Free → $19/mo at launch | Sprint 1 device builds. |
| 9 | Apple Developer | 30 min + 1-3 days | $99/yr | Same Apple-verification tail as Regal. |
| 10 | Google Play Console | 15 min + closed-test wait | $25 one-off | Required before Internal Testing track. |
| 11 | Sentry | 5 min | Free | Sprint 1 onwards. |
| 12 | Companies House (optional) | 30 min + days | £12 | Only if you're incorporating Builders Ready Ltd. |

---

## 1. Trademark check — `~30 min, free` — do this **first**

You won't have spent any money yet and renaming costs nothing now. Once you have a domain, a Companies House registration, and an App Store listing all called "Builders Ready," renaming is six weeks of pain.

- [ ] **UK IPO search:** https://www.gov.uk/search-for-trademark — search "Builders Ready", "BuildersReady", and the alternatives you flagged (BuildPort, ClientCircle, OnSite Portal). Look in class 9 (software) and class 42 (SaaS).
- [ ] **EU IPO search** (for safety even post-Brexit): https://euipo.europa.eu/eSearch/
- [ ] **US USPTO** (cheap insurance): https://tmsearch.uspto.gov/
- [ ] **Common-law search:** Google "Builders Ready construction" and search the App Store and Play Store for any existing apps using the name. A live unregistered competitor with prior commercial use can still cause a takedown letter.
- [ ] If clear: optional — file a UK trademark in class 9 + 42 yourself for £170 (£200 with a second class). Not urgent for v1 launch; reasonable insurance once you have paying customers.

**If "Builders Ready" is conflicted:** my preference among your alternatives would be **BuildPort** (clean, evocative, available across most TLDs as of writing — verify). Don't pick a name that requires the domain `buildersready.io` because the `.com` is taken — search anxiety is a customer trust signal you don't want.

**Capture:** confirmation that the name is clear; trademark application number if you file.

---

## 2. Domain — `~10 min, ~£15/yr`

Recommend a single .com plus the .co.uk for parking.

- [ ] **Registrar:** Namecheap, Cloudflare Registrar, or Porkbun all fine. Cloudflare's registrar charges at-cost (no markup) — that's the recommendation if you already use Cloudflare DNS for anything else.
- [ ] Register `buildersready.uk` (or your final name) + `buildersready.co.uk` (defensive).
- [ ] Don't park them on any default page yet — Vercel will take over once the project's up.
- [ ] DNSSEC: leave default for now.

**Capture:** domain name and registrar.

---

## 3. GitHub — `~5 min, free`

- [ ] Create a new **private** repo: `oddiemehraj/builders-ready` or under a new org `BuildersReady`.
- [ ] Add a placeholder `README.md` and an `LICENSE` (recommend "All rights reserved" / proprietary — not MIT). Don't open-source the product.
- [ ] Add a `.gitignore` from Regal's repo.
- [ ] Set branch protection on `main`: require PR + 1 reviewer (you are the reviewer — keeps you honest).
- [ ] Add `gh` CLI auth if not already: `gh auth login` in PowerShell.

**Capture:** repo URL.

---

## 4. Supabase — `~10 min, free for now`

**One hosted project** (confirmed 2026-05-18). Local Supabase emulator (`supabase start`) handles development; risky production migrations run during pre-announced maintenance windows.

- [ ] Sign in at https://supabase.com with `oddiemehraj@gmail.com`.
- [ ] Create a new **organisation** named "Builders Ready".
- [ ] Create one project:
  - Name: `builders-ready`
  - Region: **London (eu-west-2)** — important for UK GDPR. Don't pick Frankfurt or Ireland by accident.
  - DB password: generate strong, store in password manager
  - Plan: Free initially. Upgrade to **Pro ($25/mo)** before public launch — Pro gives daily backups, no auto-pause, and point-in-time recovery (genuinely critical when you're running a single-project setup).
- [ ] Capture from **Settings → API**:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...     # secret — admin app only
SUPABASE_PROJECT_REF=<ref>
```

- [ ] Locally: `supabase login` (Scoop-installed CLI), then `supabase link --project-ref <ref>`. Daily development uses `supabase start` for the local emulator; pushes to production via `supabase db push` only during planned maintenance windows.

> ⚠️ `service_role` keys are god-mode — they bypass RLS. Only used server-side from `apps/web/lib/supabase-server.ts` and only inside server actions or API routes. Never expose to the mobile app.

---

## 5. Stripe — `~30 min, verification 1-3 days`

- [ ] Sign up at https://stripe.com with `oddiemehraj@gmail.com` if you don't have an existing account, or create a new **Stripe account** within your existing Stripe organisation — separate from any account tied to Regal.
- [ ] Set the account country to **United Kingdom**, currency **GBP**.
- [ ] Provide business details. **Sole-trader is fine for v1** if you haven't incorporated. Stripe accepts UK personal trading; you can re-onboard the business under a Limited company later.
- [ ] Bank account: your UK personal or business account where subscription revenue lands.
- [ ] Stripe verifies identity in 1-3 days. **Test mode is unblocked immediately** — start dev work without waiting.
- [ ] Create the **Product** "Builders Ready Subscription" with three tiers (final numbers, confirmed 2026-05-18):
  - Starter, **£29/mo** + £276/yr (annual £23/mo equiv.)
  - Pro, **£69/mo** + £660/yr (annual £55/mo equiv.)
  - Unlimited, **£149/mo** + £1,428/yr (annual £119/mo equiv.)
- [ ] Tax behaviour: **exclusive** (Stripe Tax adds 20% VAT on top for UK B2B customers).
- [ ] Statement descriptor: **BUILDERS READY** (this is what shows on the builder's card statement).
- [ ] Enable **Stripe Tax** for VAT on UK B2B transactions.
- [ ] **Webhook endpoint** (created in Sprint 0 once the Vercel project is live): `https://app.buildersready.uk/api/webhooks/stripe`. Subscribe to events listed in deliverable 2 §4.

**Capture:**

```
STRIPE_SECRET_KEY=sk_live_...        (or sk_test_... in dev)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_UNLIMITED_MONTHLY=price_...
STRIPE_PRICE_UNLIMITED_ANNUAL=price_...
```

---

## 6. Resend — `~10 min, free up to 3k emails/mo + DNS time`

- [ ] Sign up at https://resend.com with `oddiemehraj@gmail.com`.
- [ ] Add domain `notify.buildersready.uk` (or whichever subdomain you prefer).
- [ ] Add the DNS records Resend issues (SPF, DKIM, DMARC) to your domain registrar's DNS panel.
- [ ] Wait ~30 min for propagation; Resend will verify automatically.
- [ ] Create an API key with `email.send` permission only.

**Capture:**
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Builders Ready <hello@notify.buildersready.uk>
```

---

## 7. Vercel — `~5 min` — likely existing account

You already have Vercel Pro ($20/mo) for Regal. Add Builders Ready as a separate **project** under the same account/team.

- [ ] In the Vercel dashboard, **New Project** → import the `builders-ready` GitHub repo when ready.
- [ ] Add two domains in the project: `buildersready.uk` (apex, marketing) and `app.buildersready.uk` (admin/auth/API).
- [ ] DNS: at your registrar add the `A` / `CNAME` records Vercel issues.
- [ ] Add env vars (Supabase, Stripe, Resend, Sentry) under **Settings → Environment Variables**. Mark production-only where appropriate.

**Capture:** Vercel project ID, the two custom domains.

---

## 8. Expo / EAS — `~5 min, free initially`

- [ ] In https://expo.dev, **New organisation** with slug `buildersready` (or accept whatever's available).
- [ ] In the mobile app root: `pnpm dlx eas-cli login` then `pnpm dlx eas-cli init`. This stamps the EAS project ID into `apps/mobile/app.config.ts`.
- [ ] Stay on the **Free** plan until first production build. Upgrade to **Starter ($19/mo)** before the first store build (priority lane, more build credits).
- [ ] Configure an EAS Update channel: `production` (Sprint 1 onwards).

---

## 9. Apple Developer — `~30 min + 1-3 days`

You can either (a) hold a **second** Individual account under your personal name (keeping Regal's separate), or (b) wait until you've incorporated Builders Ready Ltd and enrol as **Organisation** with a D-U-N-S number (takes longer; D-U-N-S adds ~1 week).

**Recommendation: option (a).** Get to launch fastest. Transfer to a Builders Ready Ltd org account post-launch.

- [ ] Apple ID with 2FA — can reuse the one Regal uses, since Apple permits multiple Dev accounts per Apple ID.
- [ ] Enrol at https://developer.apple.com/programs/enroll/ → Individual → fill legal name and address exactly as on your government ID.
- [ ] Pay $99 USD (~£79-99).
- [ ] Wait for verification email; Apple sometimes phones.

**Capture:**
```
APPLE_ID=oddiemehraj@gmail.com
APPLE_TEAM_ID=<10-char>
ASC_APP_ID=<set during Sprint 3>
```

---

## 10. Google Play Console — `~15 min + closed testing window`

- [ ] Sign up at https://play.google.com/console/signup with `oddiemehraj@gmail.com`.
- [ ] Choose **Personal** account (or Organisation if you've incorporated). Personal can be migrated later.
- [ ] Pay $25 one-off.
- [ ] **New personal accounts require 12 testers in closed testing for 14 days** before first public release. Plan for this in Sprint 3.

---

## 11. Sentry — `~5 min, free`

- [ ] Sign up at https://sentry.io.
- [ ] Create **organisation** "Builders Ready".
- [ ] Two projects:
  - `builders-ready-mobile` — platform: React Native
  - `builders-ready-web` — platform: Next.js
- [ ] Free Developer plan covers ~5k errors/mo — plenty for v1.

**Capture:**
```
SENTRY_DSN_MOBILE=https://...@...sentry.io/...
SENTRY_DSN_WEB=https://...@...sentry.io/...
```

---

## 12. Companies House — optional, `~30 min + a few days, £12`

You can ship Builders Ready as a sole trader using your personal name. Incorporating gives you (a) liability separation, (b) cleaner story for builders signing your T&Cs, (c) easier Stripe organisation onboarding, (d) tax flexibility once revenue grows.

If you decide to incorporate:

- [ ] https://www.gov.uk/limited-company-formation → online incorporation.
- [ ] Pick a unique name — search at https://find-and-update.company-information.service.gov.uk/.
- [ ] **Note:** Companies House does **not** prevent name conflicts with trademarks — trademark check (step 1) is what matters for product naming.
- [ ] £12 fee, usually approved within 24 hours.
- [ ] Once incorporated, open a business bank account (Tide, Starling, or Wise all 1-day-ish onboarding) and update Stripe + Vercel + Resend billing accordingly.

---

## 13. T&Cs and Privacy Policy — `~£0-£400`

You inherit none of these from Regal — Builders Ready needs its own as a *platform terms* document covering both the builder (paying user) and the indirect client (the builder's homeowner whose data ends up in Supabase).

- [ ] **Template route:** Termly (~£18/mo) or Genie AI (one-off £150ish) generate a starter T&Cs + Privacy Policy. Fine for v1.
- [ ] **Lawyer route:** £400-£800 with a UK SaaS specialist for properly drafted terms. Worth it before paid customers, not before launch.
- [ ] **DPA (Data Processing Agreement):** required by some builders' clients (especially commercial work). Have a template ready even if you don't put it on the marketing site — Notion-style "available on request."
- [ ] Hosted at `buildersready.uk/privacy` and `/terms`.

---

## 14. Critical-path summary table

| Step | When you need it | Time | Cost |
|---|---|---|---|
| 1. Trademark check | **Now** | 30 min | Free |
| 2. Domain | Sprint 0 Day 1 | 10 min | ~£15/yr |
| 3. GitHub | Sprint 0 Day 1 | 5 min | Free |
| 4. Supabase (×1 project) | Sprint 0 Day 1 | 10 min | Free → ~$25/mo prod |
| 5. Stripe | Sprint 0 Day 5 | 30 min + 1-3 days | Free until first charge |
| 6. Resend | Sprint 0 Day 5 | 10 min + DNS | Free |
| 7. Vercel project | Sprint 0 Day 1 | 5 min | Existing account |
| 8. Expo / EAS | Sprint 0 Day 1 | 5 min | Free → $19/mo |
| 9. Apple Dev | **Start now** (1-3 day tail) | 30 min | $99/yr |
| 10. Google Play | Sprint 2 | 15 min + 14d wait | $25 one-off |
| 11. Sentry | Sprint 1 | 5 min | Free |
| 12. Companies House | Optional, before first paying customer | 30 min | £12 |
| 13. T&Cs / Privacy | Sprint 2 | 1 hr template / 1 wk lawyer | £0-£800 |

**First-year fixed cost (running):** ~£90-£120/month for everything once Pro/Starter tiers kick in. **One-off costs:** £15 domain + £99 Apple + £25 Google Play + £12 Companies House + £150-800 legal = roughly **£300-£950** depending on choices.

---

## What to paste back to me once steps 1-4 are done

```
NAME_CLEAR=yes/no                                 # from step 1
DOMAIN=buildersready.uk                          # from step 2 (or whichever)
GITHUB_REPO=https://github.com/.../builders-ready # from step 3
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

Service-role keys: paste only if you're comfortable; you can drop them straight into `apps/web/.env.local` yourself.

---

## Sign-off questions

- Sole trader for v1, or are you incorporating Builders Ready Ltd before launch?
- Single Stripe account in your name (recommended), or wait for Builders Ready Ltd to incorporate before Stripe onboarding?
- Apple Dev as a fresh Individual account separate from Regal's (recommended), or transfer-of-listing approach later?
- T&Cs: template (Termly/Genie, fast and cheap) or lawyer-drafted (slower, ~£500-£800)?
