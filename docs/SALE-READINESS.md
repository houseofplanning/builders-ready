# Builders Ready Ltd — Sale / Investment Readiness

_Last updated: 1 Nov 2026. Owner: Oddie._
_Not legal, tax or broker advice — the actual deal needs a corporate solicitor and the accountant. This is the running checklist so the business is "buy-ready" by the time we'd ever want it to be. Build it in the background alongside `docs/COMPANY-SETUP-RUNBOOK.md` (that handles the clean-entity foundation; this is the layer on top that turns a clean company into a sellable one)._

**Status key:** ✔ done · ⏳ in progress · 🔒 blocked · ◻ not started

---

## 1. Entity & IP foundation (mostly handled by the setup runbook)
- ✔ Single Ltd that owns the business (Builders Ready Ltd)
- ✔ Infrastructure + billing under the company (Vercel, Supabase, Stripe, Resend, Google Workspace, domains)
- ⏳ IP-assignment deed signed (draft ready — `docs/legal/ip-assignment-deed.md`)
- ◻ Trademark registered (on the setup list)
- ◻ Code repo moved to a company-owned GitHub org (currently personal — fine now, do before any deal)
- ◻ Statutory records current: confirmation statement, registers of members/directors/PSC, board minutes for key decisions

## 2. Data room (one tidy folder a buyer's lawyers can be handed)
_Keep this current as we go so a sale never triggers a document scramble._
- ◻ Certificate of incorporation + up-to-date Companies House filings
- ◻ Signed IP-assignment deed + trademark certificate
- ◻ Cap table (who owns what — simple today: 100% Oddie)
- ◻ All statutory accounts + management accounts
- ◻ Key contracts (customer Terms, supplier/processor agreements, any partner deals)
- ◻ List of all software/services, accounts and who owns them (`docs/direct-debits-to-move.md` is the seed)
- ◻ Employment/contractor agreements (with IP clauses) — none yet, add as hired

## 3. Financials & metrics (the numbers a buyer values the business on)
- ◻ Clean multi-year statutory accounts (needs the accountant — on the setup list)
- ◻ **Founder dashboard — FINISH IT.** Already started but never completed:
  - Built: `apps/web/app/admin/page.tsx` (founder dashboard page) + `supabase/migrations/20260519000056_founder_metrics.sql` (a platform-admin-gated `founder_dashboard()` RPC).
  - Not done: the migration was never applied to Supabase, so the page has no data yet. Apply the migration (run the SQL), confirm the RPC returns, then wire/verify the page.
  - Metrics it should surface (the SaaS KPIs a buyer/investor asks for): **MRR** (and ARR), new vs churned MRR each month, **active paying subscribers** by tier, **churn rate**, trial→paid conversion, total registered trades vs customers, marketplace jobs posted/filled, and payment volume through Stripe. 
  - Why it matters: this is the single artefact that answers "how's the business doing?" in a sale or raise. Having the history by the time we need it is worth more than building it the week of a deal.
- ◻ Track the metrics over time so there's a trend, not just a snapshot

## 4. IP chain from everyone (not just Oddie)
- ⏳ Oddie's own contributions assigned (the deed)
- ◻ Any future contractor/freelancer/hire signs an IP-assignment clause BEFORE touching code or designs — no exceptions, or it leaves a gap in the chain of title a buyer will find
- ◻ Confirm no third-party/open-source code with licences that would worry a buyer (keep a dependency licence note)

## 5. Contracts & data protection
- ◻ Customer Terms + Privacy Policy named to Builders Ready Ltd (on the setup list)
- ◻ GDPR: ICO registration (setup list) + data-processing terms in the Terms (controller/processor split for builders' client data)
- ◻ No "change of control" clauses in customer/supplier contracts that let the other side exit on a sale
- ◻ Confirm revenue genuinely transfers with the company (contracts are with the Ltd, not Oddie personally)

## 6. Key-person risk (the biggest lever on price for a solo founder)
_Right now the business is largely Oddie — a buyer discounts heavily for that. These lift the valuation:_
- ◻ Documentation so the product isn't only in Oddie's head (architecture notes, runbooks, how things are deployed)
- ◻ Repeatable, written processes (support, onboarding, releases)
- ◻ Some team or at least a clear handover plan
- ◻ Reduce "bus factor" on critical accounts (access not tied to one personal login)

## 7. Tax planning (do EARLY — timing matters)
- ◻ Talk to the accountant about **Business Asset Disposal Relief (BADR)** well before any sale.
  - Cuts CGT on qualifying share gains. Broad conditions: hold ≥5% of shares + be an officer/employee for ≥2 years before sale (easy as sole founder — but the 2-year clock is worth being aware of).
  - Rate: 14% for 2025/26, rising to **18% from 6 April 2026**. Lifetime limit £1m (one report claims it's being cut to £500k under Budget 2026 — unconfirmed; accountant to verify against the Finance Act).
- ◻ Decide share structure before taking any investment (a raise changes the cap table and may bring a shareholders' agreement, EMI options, etc.)

## 8. The deal process (reference — when the time comes)
_Months, not weeks. The corporate solicitor earns their fee here._
1. Valuation
2. Broker / M&A advisor to find and vet buyers
3. Heads of terms (non-binding outline)
4. Due diligence (they go through the data room)
5. Share Purchase Agreement — warranties & indemnities (what you promise is true)
6. Disclosure letter (where you flag exceptions to those promises)
7. Completion

---

## Most valuable next moves on THIS list
- **Finish the founder dashboard** — apply the migration, get MRR/churn/subscriber metrics live, and start accruing history.
- **Keep the data room tidy as we go** — every doc we create (deed, accounts, contracts) drops into one folder.
- **Never let code in without an IP clause** once anyone else contributes.
- Everything else here rides along with the setup runbook.
