# Builders Ready — Connected Subs, Accounts & Marketplace Identity Spec

_Last updated: 5 Nov 2026. Owner: Oddie. Status: flow mapping, pre-build._
_This spec defines how a person (operative or subcontractor) exists in Builders Ready, how they connect to a builder, what they can see, and who pays. It sits underneath the Scheduling spec and the Marketplace. Decisions locked with Oddie are marked **[locked]**; anything still open is in section 12._

---

## 1. The problem we are solving

Today a subcontractor exists in only one form: a row of details the builder typed into their team (a `resources` row). That is a contact card. It is enough to schedule and cost them, but:

- The sub has no account, so they never see the job, never get told they have been booked, and cannot confirm or decline.
- There is no concept of the sub owning their own profile, so nothing carries across builders, and the marketplace (where a sub bids on work and keeps their reviews) has nothing to stand on.

The vision needs the same person to exist in two linked forms at once: **their own profile**, which they own and carry everywhere, and **the builder's private record of them**, which holds the rate that builder pays. This spec defines that split and everything that hangs off it.

---

## 2. The core model: two things, linked

### 2.1 The profile (their account) — owned by them, one per person, platform-wide **[locked]**

One Builders Ready account per real person or firm. Lives at the platform level, not inside any one builder's business. Holds:

- Who they are: name, trade(s), contact, service area.
- Their credentials: certs, insurances, qualifications (with expiry).
- Their reputation: reviews and completed-job history across every builder they have worked with.
- Their own schedule: every booking across every builder, in one "my week" view.

This is the thing that "retains their profile" across builders, and the thing they bid from on the marketplace. It is **one profile** even though it may be connected to many builders.

### 2.2 The resource row (the builder's record of them) — private to the builder

Exactly what exists today. Private to one builder. Holds:

- The **rate this builder pays** them, and the resulting cost to this builder's margin.
- Their **bookings on this builder's jobs**.
- The builder's own notes.

Another builder has a separate resource row for the same person, with a different rate. **Neither builder sees the other's rate, bookings, or notes.** The sub sees all of their own bookings across every builder in their profile's schedule.

### 2.3 The connection — the link between the two

A resource row either stands alone (a typed-in contact) or is **connected** to a platform profile. The connection is what turns a contact card into a live, two-way relationship. One connection model is shared by every way a connection can start (section 5).

> **Principle:** Rates and cost are the builder's, and private. Profile, certs, reviews and the person's own schedule are theirs, and shared. One person, many builders, many private rates, one profile.

---

## 3. Account types and pricing **[locked]**

The charge follows the benefit, not the person. The dividing line:

> **Free to receive work you are given. Pay, and you are a full tradesman on the platform with everything open.**

There are only **two postures on one account**. Paying is not a marketplace add-on; it unlocks the whole platform. "A subcontractor who pays" is simply a full builder/tradesman account.

| Posture | What they can do | Price |
|---|---|---|
| **Free connected member** | See and respond to the jobs a builder gives them: view their bookings, confirm/decline, get notified, and build a profile (certs, reviews). They **cannot** create their own projects, quotes, Planning Radar, cost/margin, or bid on work. | **Free** |
| **Paid tradesman** (identical to a builder account) | **Everything a builder gets**: create and run their own projects, quotes & estimates, Planning Radar, cost/margin, invoicing, scheduling — **and** a discoverable marketplace profile that can bid on and win other builders' jobs. | Paid subscription (existing tiers) |

Key consequences, all from one account:

- It is **one account, two postures**. The paywall line is simply: free = receive work only; paid = the full platform, discoverability and bidding included. There is no separate "marketplace-only" tier.
- Paying does not just open the marketplace — it opens **everything**. A paying tradesman has the complete builder toolset, because they *are* a builder account.
- The **same person upgrades in place**. A free connected member you invited can upgrade to the full paid account; their profile, reviews and your free relationship with them all carry over, and now they can also run their own jobs and bid for work.
- A sub you invite who only ever wants to work your jobs never pays and never needs the builder tools. The objection "why would I subscribe just to work your job" disappears, because they do not.
- Marketplace bidding is **included in the paid subscription**, not priced separately, because a paying account already has the whole platform. (Any per-win commission, if wanted, is a separate decision — see 12.)

---

## 3b. Two hats on one account: the app context toggle **[locked]**

Every paid account is both a business and a tradesman-for-hire. Rather than cram both into one cluttered view, the app has a **context toggle** at the top that switches between two modes: **My Builder Profile** and **For Hire Profile** (the locked app names). Each mode only shows what belongs to that side.

### My Builder Profile (business side) — present on paid accounts
- My projects, schedule, team & rates, quotes & estimates, cost/margin, invoicing, Planning Radar.
- Marketplace as a **hirer**: post a job, review bids, hire subs.

### For Hire Profile (for-hire side) — present on every account, free or paid
- My own profile (trade, certs, reviews).
- **My week**: every booking across every builder who has me on a job, in one schedule.
- Invites to join builders' teams (accept / decline).
- Marketplace as a **worker**: be listed in the local directory with an advertised day rate, get found and hired direct, browse open jobs, and track my bids — all shown only when "available for work" is on.

### Who sees the toggle
- **Paid account:** both sides, toggle visible, defaults to **My Builder Profile**.
- **Free connected member:** only the **For Hire Profile**, **no toggle** (with a light "Start your own business" upsell that routes to upgrade). Keeps the free operative's app dead simple.

### "Available for work" is a separate switch from the toggle
The toggle only changes what you are looking at. Whether you actually appear on the open marketplace and can bid is its own on/off setting **inside the For Hire Profile** (`worker_profiles.discoverable`). A builder running their own crew who never wants to appear as a sub just leaves it off: they still have the For Hire Profile, can still be **invited directly by name**, and still see those jobs; they are simply not listed on the marketplace.

**Default is off [locked]**, but setup surfaces it rather than hiding it. During onboarding, after the account is created, the person is asked: *"Will you also be looking for work from other builders? Set up your for-hire profile now."*
- If **yes**: they fill in their for-hire profile (trades, service area, advertised day rate, portfolio) and choose, right there, whether "available for work" is **on or off** (still defaulting to off until they actively turn it on).
- If **no / skip**: nothing is created on the for-hire side; they can set it up any time later from the For Hire Profile toggle. Their account is unaffected either way.

This means nobody is ever listed as a sub without choosing to be, but everybody is at least asked, so the for-hire side does not stay buried. ("Builder profile" vs "for-hire profile" is a copy choice for the app UI; the model is the same either way.)

---

## 4. Resource / connection states (the lifecycle)

A resource row moves through these states. Every state before "connected" already works today; connection is the new part.

```
  CONTACT ONLY ──invite sent──> INVITED ──they accept──> CONNECTED
       │                           │                         │
       │                           └──they decline/expire────┘ (back to contact only)
       │                                                     
       └── stays contact-only forever if they never join (fully valid)

  CONNECTED ──builder removes / sub leaves──> DISCONNECTED (reverts to contact-only record, history kept)
```

| State | What it means | Builder can | Sub can |
|---|---|---|---|
| **Contact only** | Typed-in details, no account. Today's Luke and Tommy. | Schedule, cost, track margin. Communicate off-platform (text/call). | Nothing (no account). |
| **Invited** | Builder sent an invite, not yet accepted. | Everything in contact-only, plus see "invite pending". | Open the invite, sign up or sign in, accept or ignore. |
| **Connected** | Resource row linked to a platform profile. | Everything, plus the sub now receives bookings and confirmations in-app. Builder's real certs/profile flow in from the sub's account. | See their jobs with limited context (section 6), get notified on booking, confirm/decline, build profile. |
| **Disconnected** | Was connected, link removed. | Falls back to a contact-only record; past bookings and costs retained. | No longer sees this builder's jobs. |

**Contact-only is permanent and legitimate, not a half-finished state.** A sub found externally who will not touch an app simply never leaves contact-only. Nothing breaks and the builder loses nothing versus today.

---

## 5. The four doors into a connection **[locked: build invite + marketplace together]**

All four create the **same** CONNECTED state against the **same** connection model. They are just different front doors. The marketplace itself runs in **two directions**: a builder can post a job and receive bids (Door C), or browse the directory of available tradespeople and hire one direct (Door D).

### Door A — Builder invites a contact
1. Builder adds a resource as now (or opens an existing contact-only one like Luke).
2. Builder taps **Invite to connect**. Enters/confirms the sub's mobile or email.
3. Sub gets a message with a link.
4. Sub signs up (free) or signs in to an existing profile.
5. Their profile links to the builder's resource row. The builder's typed details stay as the builder's; the sub's own certs/profile become the shared truth.
6. Resource row → CONNECTED. Free (team member).

### Door B — Sub self-signs-up, builder links
1. Sub signs up on their own (e.g. heard about it, wants to be found).
2. Builder searches the platform, finds them, sends a connect request (or the sub requests to join the builder's team).
3. On acceptance → CONNECTED. Free if it is a direct team link; if the person has upgraded to a full paid account they also have the whole builder platform and can bid on the marketplace.

### Door C — Marketplace bid wins
1. Builder posts a job to the marketplace.
2. Discoverable (paid) subs bid.
3. Builder accepts a bid.
4. **Acceptance is the connection.** The winning sub drops into the builder's ecosystem as a CONNECTED resource on that project, keeping their own profile and reviews. No separate invite step.
5. The bidder is already a paid tradesman account (that is how they could bid); the accepting *builder* just pays their normal subscription.

### Door D — Hire direct from the directory
1. Builder browses the local directory (all profiles with "available for work" on), or sees matching tradespeople alongside the job they are about to post, filtered by **trade + area**.
2. Each listing shows the person's profile card: trade(s), **advertised day rate**, portfolio, and reviews.
3. Builder opens a profile and taps **Invite to a job** (an existing project, or the job being posted), instead of posting and waiting for bids.
4. The tradesperson accepts → CONNECTED resource on that project. Same as Door A, but started from a search, and the person already has an account.
5. The builder sets their own **private** rate in the resource row (defaulting from the advertised rate, editable); the advertised rate is only a public starting point.

> Build order **[locked]**: build the shared account + connection model once, and wire **Door A (invite)** and the **marketplace (Doors C + D)** into it together. Door B is a small addition on top and can follow.

---

## 6. What each party sees **[locked: sub sees "their jobs + limited context"]**

### What a connected sub sees of a builder's project
- Their own bookings (which job, which days, which stage/trade).
- The **site address** and the **PM contact** for jobs they are on.
- Their own rate *as agreed with that builder* (they know what they are being paid).

### What a connected sub does NOT see
- The builder's margin, contract value, or invoicing.
- Other subcontractors' or operatives' rates.
- The client's private details.
- The full project schedule or other people on the job.

### What the builder sees of the sub
- Everything in their own resource row (their private rate, bookings, notes).
- The sub's shared profile: certs, insurances, trade, reviews, completed-job history.

### Cross-builder privacy
- Builder A cannot see Builder B's rate for, bookings of, or notes on the same sub.
- The sub sees all their own bookings across all builders in one place.

---

## 7. Data model (builds on the EXISTING marketplace — revised after schema audit, 5 Nov 2026)

**Important:** the platform already has a working homeowner↔trade marketplace. We build the for-hire/connection model on top of it, not as a parallel system. What already exists:

- **`tenants`** — every builder/tradesman *business* is a tenant (has `subscription_tier` starter/pro/unlimited, `owner_user_id`, `status`). **A paid tradesman already IS a tenant.**
- **`trades_public`** — a public-facing row per tenant (name, logo, owner, phone, email): the public trade profile. **This is the "For Hire Profile" (locked: same profile for homeowners and builders).**
- **`job_requests`** (posted by customers) + **`bids`** (placed by tenants) + **`marketplace_reviews`** (two-way, enum `review_direction` = customer_to_trade / trade_to_customer) + **`marketplace_threads`/`marketplace_messages`** — the post→bid→review→chat machinery, reusable.
- **`resources`** already carries **both** `user_id` (→ a person's login) **and** `marketplace_tenant_id` (→ another tenant on the platform). These are the two connection bridges; `marketplace_tenant_id` was added in anticipation and is currently unused.
- **`profiles`** (per auth user: name, email, phone, avatar, `notification_prefs {push,email}`). Customers (homeowners) are profiles with no tenant.

### 7.1 The two kinds of connected person map to the two existing bridges
- **Paid tradesman** = a **tenant**. Hired by another builder → that builder's `resources` row has `marketplace_tenant_id` → the tradesman's tenant. Their For Hire Profile is their existing `trades_public` row.
- **Free connected member** (operative, not a tenant) = an auth user with a `profiles` row. Linked via `resources.user_id`. Receives work only; never in the directory, never bids.

### 7.2 Extend `resources` (both bridges already present)
- Add `connection_status` enum: `contact_only | invited | connected | disconnected` **[locked: explicit column]**. `contact_only` = neither bridge set and no pending invite.
- `user_id` / `marketplace_tenant_id` stay as the links; rate fields stay as the builder's private rate.

### 7.3 New: `resource_invites` — the invite bridge (Door A, genuinely new)
```
resource_invites
  id, tenant_id -> tenants, resource_id -> resources,
  channel text ('email' at launch), sent_to text, token text unique,
  status text (pending|accepted|declined|expired),
  invited_by uuid -> auth.users, created_at, responded_at
```
On accept: set `resources.user_id` (operative) or `resources.marketplace_tenant_id` (if they are/become a tenant) and `connection_status='connected'`.

### 7.4 Extend the existing marketplace for the builder→sub direction (Doors C + D, marketplace step)
Reuse, do not rebuild:
- **For-hire fields on the tenant profile:** add `discoverable boolean default false` ("available for work"), `day_rate_pence`, `day_rate_unit`, and trade/`service_area` for directory filtering. (Advertised `day_rate_pence` is public and only a starting point; the builder's private `resources` rate when they hire is separate and never shared.) Today all 18 tenants sit in `trades_public` with no gating; `discoverable` adds the opt-in filter.
- **Directory (Door D):** browse tenants where `discoverable = true`, filtered by trade + area, showing the `trades_public` card + advertised rate + reviews. Hire-direct creates the same connection as an invite, pointing a `resources` row at that tenant via `marketplace_tenant_id`.
- **Builder-posted jobs for subs (Door C):** `job_requests` are currently customer-posted; extend so a **tenant** can post a job that tradespeople bid on (add a poster-type/`posted_by_tenant_id`, or a sibling table if cleaner — decide at build time), reusing `bids`. Accepting a bid creates the `marketplace_tenant_id` connection.
- **Reviews:** reuse `marketplace_reviews`; add `review_direction` values for builder↔sub (e.g. `builder_to_sub` / `sub_to_builder`), unlocked on job completion.

Certs/insurances already exist as `resource_documents`; a tenant-owned cert set shown on the public profile can reuse the same shape. RLS keeps the existing shape; the new worker-owned reads (a tenant seeing jobs it was hired for) extend patterns already used by the marketplace.

---

## 8. Edge cases and how they resolve

| Case | Resolution |
|---|---|
| Sub found externally, will not join at all | Stays CONTACT ONLY forever. Scheduled and costed as today, communicated off-platform. Nothing breaks. |
| Sub in your team (free) later wants more work | They switch on `discoverable` (paid). Profile goes live on the marketplace; their free team link with you is untouched. |
| Same sub works for three builders | One profile, three resource rows, three private rates. Sub sees all bookings in one schedule; no builder sees another's terms. |
| Builder removes a connected sub | Resource reverts to a contact-only record; past bookings and costs are kept for the builder's history; sub stops seeing that builder's jobs. |
| Sub deletes their account | Builder's resource rows revert to contact-only (details the builder had are retained on the builder's side); profile, reviews and cross-builder schedule go. |
| Two builders both typed in the same sub, who then joins once | Their one profile connects to each builder's row independently as each invite is accepted. No merging of builders' private data. |
| Invited person already has an account | Door A step 4 becomes "sign in" instead of "sign up"; same link to the resource row. |

---

## 9. Notifications (new, required for the loop to be worth anything)
**Channels [locked]: push + email at launch. No SMS for now** (can be added later).
- On **booking**: connected sub gets a notification "You're booked on [job], [dates]".
- On **change/removal**: sub is told their booking changed or was removed.
- On **invite**: the invite message itself (push + email; the Door-A invite to a not-yet-joined contact goes by email, since they have no account to push to yet).
- On **bid accepted** (Door C): the winning sub is notified and connected; losing bidders are notified.
- Builder side: notified when a sub confirms/declines a booking, and when bids come in.

---

## 10. How this sits with the Scheduling feature
- The scheduler already assigns `resources` to projects. Nothing about assigning changes. Connection only adds: the assigned person can now *see* the assignment and respond to it.
- The "limited context" the sub sees (section 6) is a filtered read of the same project the scheduler already knows about.
- Cost/margin are unaffected: the builder's private rate still drives cost exactly as now.

---

## 11. Suggested build order
1. **Connection on `resources`** (add `connection_status`, use the existing `user_id` / `marketplace_tenant_id` bridges, disconnect). No new identity tables — reuses `profiles` (operatives) and `tenants`/`trades_public` (tradesmen).
2. **Door A: invite flow** (`resource_invites`, email invite, accept → connect). The team-side launch-blocker.
3. **Connected member mobile view**: "my week" + per-job limited context + confirm/decline.
4. **Notifications** on booking/change/invite (push + email).
5. **Marketplace (Doors C + D)**: for-hire fields on the tenant profile (`discoverable`, day rate, trade/area), the directory (browse discoverable tenants, hire direct → connect via `marketplace_tenant_id`), builder-posted jobs reusing `job_requests`/`bids`, and builder↔sub `marketplace_reviews` directions.
6. **Door B: self-signup + builder search/link** (small, on top of 1–2).

Steps 1–4 deliver the team-side connected loop (the current launch blocker) with no change to the existing marketplace tables. Step 5 extends the marketplace. Step 6 is a convenience door.

---

## 12. Decisions **[all locked]**
1. **State storage:** explicit `connection_status` column (`contact_only | invited | connected | disconnected`), not derived. Clearer to read and query.
2. **Notification channels:** **push + email** at launch. **No SMS** for now (per-message cost + provider setup); can be added later.
3. **Marketplace pricing:** bidding is included in the standard paid subscription; the **subscription is the whole charge**. **No per-win commission** for now; can be added later.
4. **Review trigger:** **two-way** (builder reviews the tradesperson, tradesperson reviews the builder), unlocked **on job completion**. Matches the existing homeowner-marketplace review model.
5. **Firm vs individual:** **v1 is one profile = one person**, even when they trade under a company name. Multi-worker firms (a company profile that assigns one of several workers to a job) are a later addition.
6. **Vetting:** **open to list straightaway** for v1, no verification gate before going discoverable. **Certs/insurances show on the profile** so builders can judge who they are approaching for themselves, and the app makes clear that a complete, cert-backed profile makes a tradesperson more likely to be approached and hired.
