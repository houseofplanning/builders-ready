# Builders Ready — Feature Roadmap

_Last updated: 20 Oct 2026. Owner: Oddie. Status: planning._

This is the working roadmap for the next wave of features, built from a real
builder's feedback plus competitor research. It is deliberately honest about
effort and about where we should build vs integrate vs partner. Timelines are
rough effort bands at roughly the pace we build at now; they move with how much
runs in parallel.

---

## Guiding strategy

**Own the spine, integrate for the specialist slabs.** No single competitor owns
the whole job from design to final payment. That is our position. The winning
move is to own the lifecycle, the collaboration, the documents and the money,
and to integrate or partner for the deep specialist tools (true photoreal 3D,
the legal text of JCT contracts) rather than trying to out-build CAD companies
or a contracts body.

**The tier logic.** Features map to price tiers by who needs them:

- **£29 Starter (sole trader):** quoting, one or two live jobs, invoicing, client portal, Planning Radar.
- **£69 Growth (small firm):** more jobs, more templates, contracts, payments, design collaboration.
- **£149 Pro (bigger contractor):** this is anchored by **scheduling, team seats, subcontractor management + CIS, and multi-project oversight.** A sole trader does not need crew scheduling or CIS returns; a contractor running eight jobs and fifteen people does, and will pay £149 for it. These features are not just competitor parity, they are what rationalises the top tier and brings in the higher-value, lower-churn customers.

---

## Sequencing at a glance

| # | Feature | Tier it serves | Effort band | Blocker / dependency |
|---|---------|----------------|-------------|----------------------|
| 1 | Certifications + verified badges | All (trust) | ~1 week | Wording of "verified"; optional cert-body lookups |
| 2 | Design-stage architect collaboration | £69+ | Few weeks | None (reuses invites + file uploads) |
| 3 | JCT upload-extract + own simple contract | £69+ / £29 | Days–2 weeks | JCT licensing stance (see flags) |
| 4 | Scheduling + team/resource management | £149 anchor | 1–2 months (v1) | Gantt component (likely paid) |
| 5 | Subcontractor management + CIS | £149 anchor | 1–2 months | HMRC CIS verification API |
| 6 | 3D planner on shtrades.co | Add-on perk | Multi-month, parallel | Auth bridge + design→quote handoff |

Recommended order: **1 → 2 → 3 → (4 and 5 together as the Pro block) →** with
**6 running in parallel on its own site** as the long bet.

---

## 1. Certifications & verified badges

**What it is.** Builders upload their accreditations (CHAS, FMB, Gas Safe,
NICEIC, TrustMark, public liability insurance) with type and expiry date. Badges
show on their marketplace profile, on bids to homeowners, and in the client
portal.

**Why.** Smallest job, biggest trust payoff. Homeowners choosing a builder on
the marketplace have almost nothing to judge on; a verified accreditation is a
strong signal and a clear reason to pick a Builders Ready trade.

**Scope.**
- Phase 1: certifications section on the tenant profile (upload doc, pick type, set expiry, auto-flag when expired). Badges rendered on profile, bid cards, client portal.
- Phase 2 (optional): real verification against the issuing bodies.

**Dependencies / outside tools.** None for Phase 1 (reuses existing file upload
and tenant profile). Phase 2 would need CHAS / FMB / Gas Safe register lookups,
which may be manual or via their own APIs if available.

**Effort.** ~1 week for Phase 1.

**Flag — the word "verified."** If a builder just uploads a PDF and we badge it
"verified," we are vouching for something we have not checked. For v1 either
label it "FMB member (self-declared)" or add a quick manual review step before
the badge goes green. Homeowners will rely on this, so get the wording right.

---

## 2. Design-stage architect collaboration

**What it is.** A new early "design" stage on a project with a shared file space,
where a builder invites an architect (an external collaborator) to upload
drawings and plans directly onto Builders Ready instead of emailing them around.
Everyone works from one place; when they meet to discuss, it is already there.

**Why.** It is the cleanest expression of the "whole lifecycle" vision and it
extends the timeline back to the very start of the job, before anyone else's
software gets involved.

**Scope.**
- Phase 1: a "design" stage on the project; a shared file area with versioning; an invited external **collaborator role** (the architect) scoped by row-level security to just that one project's design files.
- Phase 2: commenting / markup on files, approvals, and a simple handoff from design files into the quote/build stage.

**Dependencies / outside tools.** None new. Reuses the existing invite flows
(clients, marketplace), file uploads, and role-based access. The only real work
is the new role and the RLS scoping so an architect sees only their project.

**Effort.** A few weeks for a solid Phase 1.

---

## 3. JCT contracts & contract generation

Two separate things, with very different blockers.

### 3a. Upload-your-JCT → extract milestones (near-term)

**What it is.** A builder uploads their own executed JCT contract; Builders Ready
reads it and pulls out the staged-payment schedule and milestones to populate
the project, so all the signing, variations, payment notices and invoicing admin
happen inside the app around the builder's own contract.

**Why.** The management layer already exists in our contracts feature (build,
send, e-sign, milestones, variations, payment notices). This just lets a JCT job
plug into it. Most builders use JCT, per the feedback.

**Dependencies / outside tools.** PDF text extraction (we have this) plus
optional LLM extraction to pull the payment schedule (we have this). No new
external tool strictly needed.

**Effort.** Days to ~2 weeks.

### 3b. Our own ready-made simple contract (near-term, for sole traders)

**What it is.** A plain-English building contract of our own, for smaller jobs
where JCT is overkill. Generated, edited, signed and milestone-tracked entirely
inside Builders Ready.

**Why.** Sole traders on smaller work do not use JCT and are underserved by it.
A clean, fair, simple contract is genuinely useful and is entirely ours to build.

**Effort.** ~1–2 weeks (reuses the contracts engine; the work is the template
and the editor).

### 3c. Generating real JCT text (later / uncertain)

**Flag — this may not be available to us at all.** JCT's own licence terms
define a "Prohibited Entity" as any entity that develops, sells or promotes a
**document assembly product**, and restrict combining their material with other
software or entering their source documents into a service to create templates.
In plain terms, JCT appears hostile to third-party tools generating or
assembling their contracts. So "get a licence to create JCT contracts" should
be treated as uncertain, not a given. The realistic, defensible path is 3a
(read the builder's own contract) plus 3b (our own contract). Before shipping
3a, have someone confirm that reading a builder's own executed JCT PDF to
populate their project admin sits outside those terms, because it is the
builder's document and we are not assembling or selling JCT content.

---

## 4. Scheduling & team / resource management  — £149 anchor

**What it is.** The big "bigger contractor" block. Add your crew and office staff
as users, assign people to jobs, see and drag who is on what and when across all
live projects, and capture hours on site.

**Competitor benchmark (research).**
- **Knowify:** drag-and-drop scheduling of employees, equipment and subcontractors; Gantt charts with dependencies. From ~$99/mo.
- **ProjectManager:** online timesheets to control labour cost, hourly rates, resource-availability views.
- **TeamGantt:** subcontractors confirm or flag date conflicts without logging in; material lead times tracked against install tasks.
- **Build4Cast:** critical-path Gantt that auto-adjusts linked activities when delays or design changes occur; job costing and POs in the same place.
- **Buildxact:** UK edition, positions itself as a dynamic alternative to spreadsheet Gantts.
- **Buildertrend:** the most construction-specific of the mainstream tools; explicitly includes subcontractor monitoring.

**Scope.**
- Phase 1 (the killer v1): **team seats** (add crew/office as users, not just owner/PM — more seats at higher tiers is itself a tier lever); **assign people to jobs**; a **scheduling calendar / Gantt** across all live projects with drag-to-schedule, start/end dates and dependencies; **timesheets / clock-in on site**, feeding straight into the existing margin/cost engine as labour cost.
- Phase 2: **role-based permissions** (PM / site manager / admin / operative); **portfolio dashboard** (cash and margin across every live job); critical-path and auto-adjusting linked tasks; material lead-time tracking against install dates.

**Dependencies / outside tools.** Sits on top of the data model we already have
(projects, tenants, roles, cost/margin engine). The one place an external tool
genuinely saves months is the **Gantt/scheduler component**. Free options exist
(frappe-gantt, FullCalendar, Schedule-X) but are limited; for proper
construction scheduling with dependencies and critical path, a commercial
component (Bryntum Gantt or dhtmlxGantt) is worth the licence fee. Decision
needed here.

**Effort.** 1–2 months for a strong Phase 1. Much more tractable than 3D because
we are extending what exists, not inventing new software.

**Why it compounds.** Timesheets feed margin; seats drive tier upgrades; it sets
up subcontractor management (next).

---

## 5. Subcontractor management + CIS  — £149 anchor

**What it is.** Invite subbies, assign them to jobs, hold their documents
(insurance, certs — reuses feature 1), issue them tasks, and — the differentiator
— handle **CIS (Construction Industry Scheme)**.

**Why this is gold.** CIS is a legal obligation and a genuine pain for any
contractor who pays subcontractors, and it ties subcontractor management
straight to money, which is our strength. Baking it in is a strong, defensible
£149 reason that generic job-management tools skip.

**CIS benchmark (research — confirm against GOV.UK before building).**
- Contractors must **verify** a subcontractor with HMRC before the first payment, and re-verify at the start of each tax year or after two years of absence from returns.
- HMRC returns one of three outcomes: **gross (0%), net (20%), or unmatched (30%)**. The verification number is `V` + 10 digits; an unmatched result has a trailing letter and means deduct at 30%.
- Verification is online (mandatory online since April 2017), via HMRC's business tax account / API.
- Software typically: stores subbie details + UTR, applies the correct deduction rate, splits labour vs materials vs VAT, calculates deductions from subbie invoices, and files the monthly **CIS300** return. Records must be kept for 3 years.

**Scope.**
- Phase 1: subcontractor records (details, UTR, insurance/certs), assign to jobs, issue tasks, subbie confirmations on the schedule (TeamGantt-style, without a full login).
- Phase 2: **CIS** — store UTR + verification number, apply gross/net/30% deduction rate, split labour/materials on subbie invoices, and help produce the monthly CIS300. Purchase orders and supplier/materials tracking.

**Dependencies / outside tools.** **HMRC CIS verification API** for subcontractor
verification (external integration). Reuses the certifications feature for subbie
documents. Builds naturally on feature 4's assignment model.

**Effort.** 1–2 months, overlapping with feature 4.

**Flag.** Software can automate verification and deduction maths, but the
contractor stays legally responsible for applying the right rate. Keep our
framing as "helps you stay on top of CIS," not "does your CIS for you," and
confirm the current rules on GOV.UK before building.

---

## 6. 3D property planner — on shtrades.co (separate site, add-on)

**Decision:** build this as its own product on the currently-unused **shtrades.co**,
decoupled from Builders Ready, offered as an add-on: sign up to Builders Ready,
get access to the planner. This keeps a heavy, experimental 3D app from ever
threatening the reliability of the main app, lets us test in isolation, and ships
only when it is right (no pressure to release early).

**What it is.** Design a property in the browser: add an extension, build it up
part by part, do the interior and a floorplan, with the price updating live as
each element is added, pulling from the Builders Ready price engine.

**Competitor benchmark (research).**
- **Cedreo** (builder-focused): 2D/3D floor and site plans, electrical plans, cross-sections, elevations, photoreal renders, branded presentations. ~$129/mo. This is the closest target for a builder-facing tool.
- **Planner5D** (consumer): customisable floor plans, furniture, photoreal 3D; free tier + paid.
- Both are browser-based, which confirms the approach is viable on the web.

**Can we build it?** Yes, the real-time 3D is buildable in the browser with
mature open-source tech. The honest caveats are below.

**Tech / outside tools.**
- **Three.js + React Three Fiber + Drei** (free, open source) for the 3D scene and React integration.
- **three-bvh-csg** (free) for boolean operations, e.g. cutting a window or door opening into a wall.
- Reference open-source projects exist (e.g. a Three.js room designer pairing a 2D plan with a 3D view; a Sims-style multi-floor house builder with walls, roofs and walkthrough) — useful to learn from, not to ship as-is.
- A **3D asset library** (fixtures, furniture, fittings) — free packs to start, paid packs later.
- Real-time 3D runs on the user's own GPU, so standard web hosting (shtrades.co) is fine. **Photoreal, marketing-quality rendering** is the harder tier and may later need a commercial render service or SDK (this is where Cedreo spends its effort). Start real-time, add photoreal later.

**On 2D vs 3D (Oddie's point).** Agreed, and here is the resolution: bolting 3D
onto a 2D-only data model later is painful and causes rework. So we **build the
data model 3D-native from day one** — every element is a real 3D object with
true dimensions and height. The first editing surface can still be a plan
(top-down) view, which is easier to build and to use, but it edits the same 3D
model underneath. That way we "start with 3D" structurally, with no throwaway
work, without betting the whole first release on the hardest UI.

**The two integration points that make it feel like one product (design these up front):**
1. **Entitlement / sign-in.** A Builders Ready subscriber should land in the planner with no second signup. Cleanest: the planner shares Builders Ready's Supabase backend (same user table), or calls Builders Ready to check "is this a paying subscriber, and on which tier." Small if the backend is shared.
2. **Design → quote handoff.** The magic is that a design comes back into Builders Ready as a priced quote/project. Even a simple export (the planner emits a priced parts list that imports into a BR estimate) keeps the thread intact: design it, price it, quote it, build it, get paid. Build this bridge early, even while the 3D itself is still basic.

**Effort.** Multi-month, specialist, iterative — but decoupled, so it runs in
parallel without holding up anything else. No release until it is right.

---

## Outside tools & dependencies — summary

| Feature | External tool / integration | Build vs buy |
|---------|-----------------------------|--------------|
| Certifications | CHAS/FMB/Gas Safe lookups (Phase 2 only) | Build; buy/integrate later |
| Architect space | none | Build |
| JCT upload-extract | PDF + LLM extraction (have) | Build |
| JCT generation | JCT licence (uncertain — see flag) | Partner / likely blocked |
| Scheduling | Gantt component (Bryntum / dhtmlx, likely paid) | Buy component, build around it |
| Subcontractor + CIS | HMRC CIS verification API | Build integration |
| 3D planner | Three.js + R3F + Drei + three-bvh-csg (free); 3D assets; photoreal render service later | Build on OSS; buy assets/render later |
| 3D planner | Auth bridge to BR (shared Supabase) | Build |

---

## Open questions / decisions needed

1. **Build capacity** beyond these sessions — this is the single biggest driver of every timeline.
2. **Scheduling Gantt component** — free (limited) vs paid (Bryntum/dhtmlx). Recommend paid for construction-grade dependencies/critical path.
3. **"Verified" wording** on certifications for v1 (self-declared vs manual review).
4. **JCT** — get a definitive read on whether upload-extract sits outside JCT's terms, and whether any licence to generate JCT is even on offer.
5. **3D scope line** — how far into photoreal we go in v1 vs real-time only.
6. After this wave: the next feedback items Oddie mentioned, to be added here.
