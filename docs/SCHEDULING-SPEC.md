# Builders Ready — Scheduling & Resource Management Spec

_Last updated: 5 Nov 2026. Owner: Oddie. Status: mapping, pre-build._
_This is the £149 "Pro / Unlimited" anchor feature. Decisions locked with Oddie: buy Bryntum for the scheduler; Phase 1 delivers the per-project dashboard AND the cross-project scheduler together off one shared resource model; Phase 1 ships on web plus a crew mobile view._

---

## 1. What we are building

A proper scheduling and resource tool for small-to-medium builders who run several jobs at once with their own crew and subcontractors out on site. The owner needs to see, at a glance:

- **Where everyone is.** Which person or subbie is on which job, today and across the week.
- **What stage each project is in**, and who is on it.
- **What each project is costing the business** in labour and subcontractor time, live, feeding the margin they already see.
- **A proper dashboard per project** on the web, plus a top-level view across all projects.

When a new project kicks off, the owner assigns people to it and they are notified. Big job or small, nobody is left wondering where they are meant to be.

### Reference targets (from the screenshots Oddie supplied)

1. **Cross-project scheduler (Bryntum-style).** A left-hand tree of projects and jobs with people nested under them, and a timeline on the right showing coloured booking bars per person per day. Legend: live project / project on hold / settled project / internal job / subcontractor job / unplanned. Week and timeline views, drag to schedule.
2. **Owner dashboard ("Hi Tony").** KPI tiles: total job value, completed, total costs, total profit margin, invoiced. A jobs breakdown by workforce type (direct workforce / plant / subcontracted / other) and a cost breakdown by category (teams / vehicles / expenses / subcontractors), top clients, and project health.
3. **Completed vs invoiced table.** Per project and per job: job value, completed %, invoiced %, a position flag (Above / To invoice / Matched / Mixed), the difference, and an Invoice action.
4. **Timesheet view (per person).** Travel, breaks, regular time, overtime, PTO, payable time, rejected, total payable, with per-day bookings and a pending/approved status.

Items 1 and 2 are Phase 1. Item 3 overlaps with the contracts/invoicing we already have and is folded into the dashboard in Phase 1, lightly, then deepened in Phase 2. Item 4 (full timesheets with approval and payroll-grade totals) is Phase 2.

---

## 2. How it fits what already exists

We are extending the current model, not inventing a parallel one.

| Existing | Role in scheduling |
|---|---|
| `projects` (tenant, status, start/estimated-end, pm_id, progress, current_stage_id) | The top level of the scheduler tree and the subject of each per-project dashboard. |
| `project_stages` (position, name, status, start/target-end dates) | The schedulable "what stage" unit and the per-project timeline. Already editable (migration 45). |
| `tenant_members` (owner / pm / client) | Office users who log in. Crew and subbies are NOT members today, so they are new (see resources below). |
| `project_costs` (categories: materials, labour, plant_hire, subcontractor, other) | Where scheduled labour and subcontractor time lands as cost-to-business, feeding the existing margin engine. The categories already match the dashboard's cost breakdown. |
| `cost_category` enum | Reused as-is. "Direct workforce" = labour; "plant/vehicles" = plant_hire; "subcontractors" = subcontractor; "expenses/other" = other. |

The key gap: there is no concept of a **person or subbie you can assign to a job** who is not an app login. That is the heart of Phase 1.

---

## 3. Data model (Phase 1)

Two new core tables, one enum set, plus a rate on each resource. All tenant-scoped with row-level security identical in shape to the rest of the schema (tenant isolation, owner/PM write, client no access).

### 3.1 `resources` — the people and subbies you can schedule

A resource is anyone or anything you put on a job: an employed operative, the owner/PM themselves, or a subcontractor (individual or firm). Some resources are also app users (they get the mobile schedule); most are not.

```
resources
  id              uuid pk
  tenant_id       uuid -> tenants
  kind            resource_kind  -- 'staff' | 'operative' | 'subcontractor'
  display_name    text
  user_id         uuid null -> auth.users   -- set when this resource logs in (mobile)
  member_user_id  uuid null                 -- if they are a tenant_member (owner/PM)
  trade           text null                 -- e.g. 'Groundworks', 'Electrician'
  marketplace_tenant_id uuid null           -- optional link to a marketplace trade
  phone           text null
  email           text null
  cost_rate_pence bigint null               -- their cost to the business
  cost_rate_unit  rate_unit                 -- 'day' | 'hour'
  colour          text null                 -- optional scheduler colour override
  active          boolean default true
  created_at / updated_at
```

- **Why a rate on the resource:** cost-to-business is `rate x scheduled duration`. A day-rate operative at £180/day on a job for 3 days is £540 of labour cost; a subbie firm at £1,200/day shows as subcontractor cost. This is what drives the live margin and the dashboard cost breakdown with no manual entry.
- **`user_id` vs `member_user_id`:** an operative can have a login for the mobile schedule without being a full office `tenant_member`. The owner/PM are resources too (so they can be scheduled), linked via `member_user_id`.

### 3.2 `assignments` — a resource booked on a job for a time range

This is the booking bar on the scheduler and the "who's on it" on the dashboard.

```
assignments
  id            uuid pk
  tenant_id     uuid -> tenants
  project_id    uuid -> projects
  stage_id      uuid null -> project_stages   -- optional: which stage/job
  resource_id   uuid -> resources
  starts_at     timestamptz
  ends_at       timestamptz
  booking_kind  booking_kind   -- 'work' | 'travel' | 'leave' | 'unplanned'
  status        assignment_status -- 'planned' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
  note          text null
  cost_pence    bigint null    -- snapshotted from resource rate x duration (nullable; computed)
  created_by    uuid -> profiles
  created_at / updated_at
```

- The scheduler reads assignments as events keyed by `resource_id` (rows) across time (columns).
- The per-project dashboard reads assignments by `project_id`.
- `cost_pence` is computed from the resource rate and duration at save time (and recomputed on edit), so the dashboard and margin are instant and do not re-derive on every read. A nightly reconcile can be added later.

### 3.3 New enums

```
resource_kind      : 'staff' | 'operative' | 'subcontractor'
rate_unit          : 'day' | 'hour'
booking_kind       : 'work' | 'travel' | 'leave' | 'unplanned'
assignment_status  : 'planned' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
```

### 3.4 Cost-to-business wiring

Scheduled time becomes cost in the existing margin engine without double entry:

- Each assignment carries a computed `cost_pence` (rate x duration, pro-rated for part days / hours).
- A **per-project labour-and-subbie cost** is the sum of assignment `cost_pence` for that project, split by resource kind into the existing `cost_category` buckets (operative/staff -> `labour`, subcontractor -> `subcontractor`).
- This feeds the project's live margin (contract value minus costs) that builders already see, and the dashboard cost breakdown.
- **Decision to confirm:** whether scheduled labour auto-writes rows into `project_costs`, or stays a parallel "scheduled cost" line that the margin view adds in. Recommended: keep scheduling cost as its own computed line (do not auto-insert into `project_costs`), so manually logged receipts and scheduled labour never double-count. The margin view sums both.

---

## 4. The three surfaces (Phase 1)

### 4.1 Per-project dashboard (web)

Each project gets its own dashboard page on the web app (extends the existing project view). Sections:

- **Header KPIs for this project:** job value (contract value), costs to date (logged + scheduled), live profit margin %, invoiced vs completed.
- **Current stage** and progress, with the stage timeline.
- **Who's on it:** the resources assigned to this project now and this week (crew + subbies), each with their role/trade and their cost contribution.
- **Cost-to-business breakdown** by category (labour / subcontractor / plant / materials / other), the per-project version of the owner dashboard's cost breakdown.
- **Project health** flag (on track / at risk) from dates and margin.

### 4.2 Cross-project scheduler (web, Bryntum)

The "where is everyone" view. Bryntum Scheduler Pro, configured to match the reference:

- **Left tree:** projects (and their stages as sub-rows) with assigned resources nested, or a resource-first view (people as rows) toggle. Both are standard Bryntum modes.
- **Timeline:** booking bars per resource per day, coloured by project status (live / on hold / settled) and job type (internal / subcontractor / unplanned), matching the legend.
- **Drag to schedule**, resize to change duration, drag between resources to reassign. Writes back to `assignments`.
- **Views:** week and timeline (month) to start; day later.
- **Conflict highlight:** a resource double-booked shows a clash.

### 4.3 Crew mobile (React Native)

A "my schedule" screen for operatives and subbies who have a login:

- **My jobs this week:** each assignment with the project, address, stage, dates/times, and a map link.
- **Today:** where to be now.
- **Notified on assignment:** a push (for app users) or email (for everyone) when they are put on a job or their booking changes. Reuses the existing notification system (add a `notification_kind` for assignments).

Office users (owner/PM) see a read-only version of the scheduler on mobile; full drag-scheduling stays on the web where the screen size suits it.

---

## 5. Bryntum integration plan

- **Licence:** Bryntum Scheduler Pro, a per-developer perpetual licence with a year of updates (roughly £400-900 depending on bundle). One decision: Scheduler Pro (resource x time, what the screenshots show) vs Gantt (task dependencies / critical path). Phase 1 is **Scheduler Pro** (people on jobs over time); Gantt-style dependencies are a later addition if wanted.
- **Install:** Bryntum ships via a private npm registry with the licence key; add to `apps/web` only (web-first for the heavy grid). Keep it out of the mobile bundle.
- **Data binding:** map `resources` -> Bryntum resources, `assignments` -> Bryntum events, `projects`/`stages` -> resource grouping or a second store. Load via a server action; write changes back through our own API with RLS, not direct DB access.
- **Theming:** restyle to the Builders Ready palette so it does not look like a stock demo.
- **Risk:** Bryntum is a big component; isolate it behind our own data layer so a future swap is possible, and lazy-load it so it never slows the rest of the app.

---

## 6. Phased plan

**Phase 1 (this build) — the core, web + crew mobile:**

- 1a. Schema + shared types: `resources`, `assignments`, enums, RLS, computed cost. _(migration drafted, not yet applied)_
- 1b. Resource management (web): add/edit crew, operatives and subbies with their rates.
- 1c. Per-project dashboard (web): stage, who's on it, cost-to-business, margin, health.
- 1d. Cross-project scheduler (web): Bryntum, drag-to-assign, coloured bars, week/timeline.
- 1e. Crew mobile: my schedule + assignment notifications.
- 1f. Cost-to-business wiring into the margin engine; typecheck; apply migration; deploy.

**Phase 2 — depth:**

- Timesheets: clock-in on site, travel/breaks/overtime/PTO, approval, payable totals (the fourth screenshot), feeding real (not just scheduled) labour cost.
- Jobs-within-a-project layer with their own value and invoicing (the completed-vs-invoiced table at job granularity).
- Subcontractor documents + CIS (ties into the separate subcontractor/CIS roadmap item).
- Gantt dependencies / critical path if wanted.
- Portfolio owner dashboard across all projects (the full "Hi Tony" top-level view).

---

## 7. Open decisions

1. **Bryntum bundle:** Scheduler Pro only for Phase 1 (recommended), or buy the Gantt bundle now for later dependency support?
2. **Scheduled labour vs `project_costs`:** keep scheduled cost as a separate computed line (recommended, avoids double-count), or auto-write into `project_costs`?
3. **Resource = stage or job:** schedule against existing `project_stages` in Phase 1 (recommended), or introduce a dedicated jobs layer now?
4. **Subbie identity:** a plain resource record in Phase 1, or link to a marketplace trade where one exists (nice-to-have, additive later)?
5. **Mobile for subbies without the app:** email-only notification in Phase 1 (recommended), with an app login as an opt-in later?

---

## 8. Resource types, employment and cost entry (added after design review)

A builder's workforce is two distinct things, and the tool must show them apart:

- **Your permanent team** (`kind` = staff or operative): employed, on the books all year. Cost is a **salary** (annual) or a **day rate**. Their true cost to the business is more than the headline pay (employer NI, pension, holiday), so we support an optional **on-cost percentage** to show the real daily cost.
- **Subcontractors** (`kind` = subcontractor): hired for a defined window (a few days or weeks), paid a **day rate** (or a fixed price for the engagement). A subbie has an **engagement period** (from/to) so they only appear as available within it and drop off the roster when it ends, plus **insurance/cert expiry** flags (reuses the certifications feature).

Schema refinements this calls for (small, additive, on top of migration 57):

- `rate_unit` gains `annual` (so perm staff can be entered as a salary); a day cost is derived (salary ÷ ~232 working days, then pro-rated by the 8-hour day in the cost trigger).
- `resources` gains `engaged_from` / `engaged_to` (date, for subbies) and `on_cost_percent` (numeric, default 0, for the true-cost uplift on perm staff).

**A "Team & rates" screen** (web) is where this is entered and kept: a list split into **Your team** and **Subcontractors**, each person with their trade, their pay basis (salary / day / hour) and amount, on-costs for staff, and engagement window + cert expiry for subbies. This is the single place costs live, and every cost figure on the scheduler and the per-project dashboard reads from it.

## 9. What a professional scheduling tool needs (PM gap review)

Grouped by when to build. The point of listing all of it is so the data model does not box us in later.

**Fold into Phase 1 (cheap now, painful to retrofit):**

- **Availability and non-working time.** Holidays, sick, bank holidays, training, each resource's working pattern (full-time / part-time / which days). Without this, "who's free" is wrong. `leave` is already a booking kind; this adds a proper availability layer.
- **Part-day and shift detail.** AM/PM, start and finish times, not just "a day." Call time and site address on each booking.
- **Conflict and over-allocation warnings.** Hard clash when someone is on two jobs at once; a visible flag, not a silent double-book.
- **Pay rate vs charge rate (margin per person).** What you pay a resource vs what you bill the client for them, so the margin view is real. At minimum store both.
- **Saved crews / teams.** Assign "the strip-out team" (three people) in one action, not one by one.
- **Filter and search, people-by-trade or by-project toggle** (already in the prototype).

**Phase 2 (depth):**

- **Plant and equipment as schedulable resources** (diggers, scaffolding, vans), with their own cost and availability. The reference screenshots even show a Fleet tab.
- **Skills and certification matching:** "who is qualified for this and free," tying availability to the certifications feature.
- **Capacity forecasting against the pipeline:** factor in won-but-not-started projects and outstanding quotes, so the owner can ask "if these two quotes land, do I have cover?"
- **Two-way confirmations:** notify the person and let them confirm or decline (cuts no-shows, essential for subbies).
- **Planned vs actual (timesheets):** actual hours against the plan, feeding true cost, payroll and CIS.
- **Export / print / share** a week's schedule to the team.

**Later / if wanted:**

- **Dependencies and critical path** (stage B waits on A; moving one booking shifts the rest). This is the Gantt feature we deliberately deferred; the Scheduler covers Phase 1.
- **Utilisation reporting over time** (billable %, idle time per person).
- **Travel time between sites.**

## 10. Responsive and quality bar (non-negotiable)

The production build is fully fluid, not the fixed-width prototypes. It must look professional at every size:

- A single layout that reflows: KPI tiles go 4-up on desktop, 2-up on tablet, 1-up on mobile; no stretched or orphaned cards.
- The timeline grid scrolls horizontally on narrow screens with the resource column pinned (sticky), never squashing day columns into unreadable slivers.
- On phones the owner gets a condensed capacity summary and a per-day list; the full drag-grid is a desktop/tablet experience, with crew getting their own "my schedule" mobile screen.
- Consistent spacing, type scale and the app palette throughout. Tested at mobile, tablet and desktop before it ships.

## 11. First build step (status)

Migration 57 (`resources`, `assignments`, enums, cost trigger, tenant guards, RLS) is **applied to production** and the shared types are in and typechecking. The small refinements in section 8 (salary basis, engagement window, on-costs) are the next additive migration, to apply once this review is signed off. Build order from here: Team &amp; rates screen, per-project dashboard, cross-project scheduler (vendored free component), crew mobile, cost wiring, all responsive from the first commit.

## 12. Subcontractor hire marketplace (trade-to-trade)

When a builder is short a trade, they post the need and a sole trader fills it. This is a **second, trade-to-trade marketplace**, separate from the homeowner one but living beside it on its own tab (e.g. "Hire" / "Find subbie work"). It reuses the marketplace bidding, messaging and two-way review infrastructure we already have.

- **The post:** trade (from `TRADE_CATEGORIES`), dates / duration ("2 weeks from 17 Nov"), day rate or fixed price ("£150/day"), site location, and what's needed. Created straight off a scheduling gap (the "bring in a subbie" nudge can pre-fill it).
- **The bid:** a sole trader browsing the Hire tab sees nearby subbie work for their trade and bids, with their profile, rate and certs attached.
- **On accept:** the subbie is **auto-created as a `resource`** (kind = subcontractor) in the builder's account, with the engagement window from the post and their certs pulled across, and optionally dropped straight onto the schedule. No re-keying.
- **Why it matters:** it is another concrete reason for a sole trader to join (paid work from other builders, not just homeowners), and it grows the supply side that also answers homeowner jobs.

**Cautions to design for (not blockers):**

- **CIS and payment.** The moment we facilitate hiring subbies, CIS deductions and how they get paid become relevant. Phase 1 of this feature **connects and rosters only** (no money changes hands in-app); payment and CIS come with the subcontractor/CIS roadmap item.
- **Trust and liability.** A labour marketplace carries vetting weight. Lean on certs (section 13), two-way reviews, and clear framing that the builder engages the subbie directly; we are the introduction, not the employer.
- **"Verified" wording.** Same rule as certifications: do not badge something "verified" we have not checked.
- **Cold start.** Needs sole-trader supply; mitigated because this shares the user base with the homeowner marketplace and concentrates by region.

Phasing: build on the core scheduling model, so it comes **after** the Phase 1 scheduler (it needs `resources` and the bidding infra to exist). Call it Phase 1.5.

## 13. Compliance and certifications on profiles

Documents and certs live on a resource/trade profile and are visible to the team, so a builder can keep everyone on site compliant. This is the roadmap's certifications feature, now explicitly part of scheduling.

- **What:** per resource (team member or subbie), upload accreditations and documents (CHAS, FMB, Gas Safe, NICEIC, TrustMark, public liability insurance, trade cards) with type, number, issue and **expiry date**, and the file.
- **Where it shows:** on the person's profile, on their scheduler row (a small flag), on subbie bids in the Hire marketplace, and optionally in the client portal.
- **The compliance job:** auto-flag expired or soon-to-expire certs so the team can chase them before someone turns up on site out of date. A dashboard view of "certs expiring in 30 days."
- **Schema:** a `resource_documents` table (resource_id, type, number, issued_on, expires_on, file path, verified flag), tenant-scoped, owner/PM managed, with the same storage-bucket pattern as cost receipts.
- **"Verified":** for v1, label self-declared uploads honestly (e.g. "FMB (self-declared)") or add a manual review step before a badge goes green.

Phasing: certs-on-profiles is small (~1 week) and valuable early, so it slots into **Phase 1** alongside the Team &amp; rates screen; the marketplace surfacing of certs (section 12) rides with Phase 1.5.
