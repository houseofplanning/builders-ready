# Planning Radar — Feature Spec (v1)

**Status:** Draft for review — data source PROVEN UK-wide (see §4)
**Owner:** Oddie Mehraj
**Scope:** v1, builder-facing only. Homeowner "claim your listing" loop deferred to v2.

---

## 1. One-line summary

Bring UK planning-application data (address, what's being built, and status) into
Builders Ready as a browsable, location-filtered feed, so builders anywhere in the
UK can see pre-build opportunities on their patch and approach the homeowner
directly — populating the marketplace with leads that exist whether or not any
homeowner has posted a job.

---

## 2. Why this is worth building

- **Fixes the empty-room problem** — the marketplace has value from day one.
- **A reason to open the app daily** — "what's being planned near you this week."
- **Matches how builders win work** — getting in front of a job early; we remove
  the grunt work of finding addresses.
- **A natural premium lever** (see §10).

---

## 3. Scope

### In scope (v1)
- Builder-facing feed, filtered to the builder's area, **anywhere in the UK**.
- Builder-selectable distance, work-type and status filters.
- Listing detail: address, description, work type, status, dates, map pin, link to
  the council's official record.
- Per-builder "approached / dismissed / saved" pipeline.
- Saved searches + alerts, map view, "+ Quote" template tie-in, letter generation
  (see §15).

### Out of scope (v1 — deferred)
- Homeowner "claim your listing & get quotes" loop (v2).
- Any applicant/agent contact data (not present in the source; never stored).

---

## 4. Data source — PROVEN, UK-WIDE

Builders Ready runs its own lean pipeline against **PlanIt** (`planit.org.uk`), a
national aggregator that normalises planning applications from **hundreds of UK
councils** behind one JSON API.

- **Endpoint:** `GET https://www.planit.org.uk/api/applics/json`
- **Must include a spatial/date/search restriction.** We always pass a
  **radius search**: `lat`, `lng`, `krad` (km) + a `start_date`/`end_date` window.
- Returns, per record: `address`, `description`, `app_type`, `app_state` (status),
  `app_size`, `start_date`, `decided_date`, `postcode`, `location` (GeoJSON
  lat/lon), `url` (**direct link to the council's application page**), `area_name`
  (authority), `uid`/`reference`, and **`distance`** (km from the search point).
- **No HTML scraping. No per-council logic. Nationwide in one call.**

### Live probe results (Oct 2026)
- **Manchester** 2km radius: 24k+ applications in range — real coverage, not London-only.
- **Harrogate** (North Yorkshire) 5km, 120 days: of residential-build matches,
  **100%** had address, postcode, coordinates **and a direct council portal URL**.
  Status split normalised cleanly (pending / approved / refused). Example portal
  link returned: a live `publicaccess.northyorks.gov.uk/online-applications/...` page.
- Source carries **no agent/applicant personal data** — leakage is structurally
  impossible.

### Why this is reliable where HoPS is not
HoPS breaks on the per-council HTML/Playwright layer it added to capture agent
contact + property value. Builders Ready wants none of that, so it never touches
that layer — it takes only what one stable national API already returns.

### Dependency note (decision for Oddie — §14.6)
PlanIt's free API is fair-use. For a **commercial** product relying on it at scale
we should confirm PlanIt's commercial/API terms (they offer paid API plans) and
display attribution. This is the one external dependency to lock down before
launch — cheap to resolve, important to get right for a paid product.

---

## 5. Fields we store (minimal, public, sufficient)

| Purpose | PlanIt field |
|---|---|
| Stable id (dedupe/upsert) | `uid` |
| Council / authority | `area_name` |
| Address | `address` |
| Postcode | `postcode` |
| Map pin | `location.coordinates` → lat/lon |
| What's being built | `description` |
| Work type (raw + normalised) | `app_type`; `work_category` derived (§8) |
| Status (raw + normalised) | `app_state`; `status` enum derived (§8) |
| Dates | `start_date` (validated), `decided_date` |
| Official record link | `url` (direct, from PlanIt) |

Not stored (and not in the source): any applicant/agent name, company, email, phone.

---

## 6. Architecture — catchment-based ingest

Because the UK is huge, we don't store every application in the country. We ingest
**around where builders actually are** — bounded, fresh, and resilient.

```
PlanIt API (UK-wide)                         Builders Ready (Supabase)
┌─────────────────────────┐   daily, per    ┌───────────────────────────┐
│ /api/applics/json        │   catchment     │ Edge Function: planning-ingest │
│ radius search (lat,lng,  │ ── fetch+norm ─▶│   └─ upsert ─▶ planning_listings │
│  krad) + date window     │                 │                            │
└─────────────────────────┘                 │ catchments derived from    │
                                             │ active tenants + saved     │
                                             │ searches (base postcode →  │
                                             │ geocoded lat/lon + radius) │
                                             └───────────────────────────┘
                                                  app/web read from our DB
```

- **Catchments** = the areas we pull for: each active builder's base location
  (+ their chosen distance) and each saved search. New builder/area ⇒ new
  catchment ⇒ pulled on the next run. No code change to expand coverage.
- The **`planning-ingest` Edge Function** (Deno/TS) loops the active catchments,
  queries PlanIt radius searches for a rolling date window, normalises to the §5
  shape, and **upserts** into `planning_listings` keyed by PlanIt `uid`.
- Scheduled **daily** via `pg_cron` + `pg_net` (same mechanism as push).
- Idempotent; overlapping windows cost nothing.
- Decoupling the app from PlanIt (reading our own table) is what enables alerts,
  pipeline and letters, and keeps the app fast and resilient if PlanIt is slow.

### Repo additions
- `supabase/functions/planning-ingest/` — fetch + normalise + upsert.
- `supabase/migrations/…_planning_radar.sql` — tables, enum, RLS, indexes, cron.
- `apps/mobile` + `apps/web` — the Planning Radar UI (§9, §15).
- Shared types + `work_category`/status maps in `packages/shared`.

---

## 7. Data model (Supabase)

```sql
create type public.planning_status as enum
  ('approved','pending','refused','withdrawn','other');

create table public.planning_listings (
  id                text primary key,            -- PlanIt uid
  authority         text,
  address           text not null,
  postcode          text,
  latitude          double precision,
  longitude         double precision,
  description       text,
  application_type  text,                         -- raw app_type
  work_category     text,                         -- normalised (§8)
  status            public.planning_status not null default 'other',
  status_raw        text,                         -- raw app_state
  validated_date    date,                         -- start_date
  decided_date      date,
  portal_url        text,
  source_updated_at timestamptz,
  synced_at         timestamptz not null default now()
);
create index planning_listings_geo_idx      on public.planning_listings (latitude, longitude);
create index planning_listings_postcode_idx on public.planning_listings (postcode);
create index planning_listings_browse_idx   on public.planning_listings (status, work_category, validated_date desc);

-- catchments we ingest for
create table public.planning_catchments (
  id           uuid primary key default gen_random_uuid(),
  center_lat   double precision not null,
  center_lon   double precision not null,
  radius_km    numeric not null default 16,       -- ~10 miles
  label        text,
  source       text not null default 'tenant',    -- tenant | saved_search | manual
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (center_lat, center_lon, radius_km)
);

-- per-tenant private working state + pipeline stage
create table public.planning_listing_actions (
  id         uuid primary key default gen_random_uuid(),
  listing_id text not null references public.planning_listings(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  stage      text not null default 'saved',       -- saved|approached|replied|won|not_interested
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, tenant_id)
);

-- saved searches / alerts
create table public.planning_saved_searches (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  created_by      uuid not null references public.profiles(id),
  name            text,
  center_lat      double precision,
  center_lon      double precision,
  radius_miles    numeric,
  work_categories text[] not null default '{}',
  statuses        public.planning_status[] not null default '{}',
  alerts_enabled  boolean not null default true,
  last_alerted_at timestamptz,
  created_at      timestamptz not null default now()
);

-- letters (draft → PDF → emailed to the builder)
create table public.planning_letters (
  id         uuid primary key default gen_random_uuid(),
  listing_id text not null references public.planning_listings(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  body       text not null,
  pdf_path   text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
```

---

## 8. Normalisation (the premium polish)

- **Status enum** from PlanIt `app_state`:
  - `approved` ← Permitted, **Conditions** (granted subject to conditions), Approved, Granted
  - `refused` ← Rejected, Refused, Dismissed
  - `withdrawn` ← Withdrawn
  - `pending` ← Undecided, Registered, Consulted, Received
  - `other` ← anything else
  Default feed to **Approved + Pending**; hide refused/withdrawn behind a toggle.
  "Approved" is gold (homeowner is definitely building).
- **Work category** from `app_type` + keyword match on `description`: Rear / Side /
  Two-storey / Wraparound extension, Loft conversion, Dormer, Basement, Garage
  conversion, Outbuilding / garden room, Porch, New dwelling, Other works.
- **Residential filter** — keep householder/residential building works; drop
  telecoms, adverts, tree/TPO, shopfronts, signage, pure condition-discharge and
  non-material amendments (noise).

---

## 9. App & web experience

### Mobile (`apps/mobile`) — new "Planning Radar" tab (trade-only)
- **List:** cards with work-type chip, address, one-line description, status badge
  (green Approved), **distance**, date. Approached/dismissed drop out.
- **Distance control:** builder-selectable (0.5 / 1 / 3 / 5 / 10 / 15 mi + whole
  authority). Work-type and status filters alongside.
- **Detail:** full description, map pin, dates, status, "View official record"
  link, and **Mark approached / Dismiss / Save**, **+ Quote**, **Draft a letter**.

### Web (`apps/web`) — parity section in the trade dashboard.

CTA is physical ("Approved loft conversion 0.4mi away — post a letter or knock");
no contact details because we hold none.

---

## 10. Access, RLS & premium hook

- `planning_listings`: readable by any active trade; not by marketplace customers.
- `planning_listing_actions` / `planning_saved_searches` / `planning_letters`:
  per-tenant private.
- **Premium lever (free first, gate later):** entitlement check wired in from day
  one but left open, so the tab (or radius / history / alerts) can be gated later
  with no rework.

---

## 11. Legal / compliance

- Address + description + status are public planning-register data by law.
- A letter to "the occupier" is standard lawful practice.
- No phone/email harvesting (we hold none); the in-app action is "post a letter /
  drop by," never automated outreach — clear of PECR/GDPR direct-marketing rules.
- Every listing links to the council's official record. Attribute PlanIt per §4.

---

## 12. Naming — **Planning Radar**.

---

## 13. Capabilities confirmed for v1

### 13.1 Saved searches + alerts
Builder saves area + distance + work types + status once; new matches trigger a
push and/or morning-digest alert. Daily diff of new `planning_listings` against
each `planning_saved_searches` row → existing `send_push` path. New notification
kind `planning_alert`.

### 13.2 Map view (perf-gated)
List ⇄ Map toggle; **List is default**. Map **lazy-mounts only when opened**,
renders markers for the current filter/bounds only, clusters at low zoom, caps
marker count. Never mounts on tab load. Mobile + web.

### 13.3 Approached pipeline (mini-CRM)
`planning_listing_actions.stage`: `saved → approached → replied → won →
not_interested`. A **Pipeline** sub-view groups the builder's listings by stage.

### 13.4 Templates tie-in ("+ Quote")
Each listing has **+ Quote** → opens the quote builder with the matching template
pre-installed from `work_category`, site address/postcode prefilled:
- Rear / Side / Two-storey / Wraparound extension → `extension_single_storey`
- Loft conversion / Dormer → `loft_conversion`
- New dwelling → `extension_single_storey` (build-cost engine) / review
- Garage / Basement / Outbuilding / Porch / Other → `full_renovation` (fallback)
Wires into the existing "From a template" estimate flow (web + mobile).

### 13.5 Letter generation (draft → branded PDF → email to the builder)
**Draft a letter**: auto-written, lightly **editable** occupier letter in the
builder's branding (logo + business name), addressed to "The Occupier, &lt;site
address&gt;", referencing the application. On confirm, render a **branded PDF** and
**email it to the builder's own address** (reuse existing email + branding infra)
to print and post. We never contact the homeowner; hold no homeowner contact.
Stored in `planning_letters`.

---

## 14. Decisions
1. **Naming:** Planning Radar. ✓
2. **Pricing:** free first, gate later (entitlement hook built in, left open). ✓
3. **Placement:** its own tab. ✓
4. **Distance:** builder-selectable. ✓
5. **Coverage:** **UK-wide** (PlanIt), not London-only. ✓
6. **OPEN — PlanIt commercial terms:** confirm PlanIt's commercial/API plan +
   attribution before launch (see §4). The one external dependency to lock down.

---

## 15. Build plan
1. **PR-1 — Data layer.** Migration (all tables + enum + RLS + indexes) +
   `planning-ingest` Edge Function (PlanIt radius fetch + normalise + upsert).
   Seed a couple of catchments, verify quality. *(Source proven UK-wide, §4.)*
2. **PR-2 — Daily cron + alerts** (pg_cron + pg_net; saved-search diff → send_push;
   `planning_alert` kind).
3. **PR-3 — Mobile Planning Radar tab** (list + distance + filters + detail +
   actions + pipeline).
4. **PR-4 — Map view** (lazy, perf-gated) mobile + web.
5. **PR-5 — Templates tie-in** (+ Quote).
6. **PR-6 — Letter generation** (draft → branded PDF → email to builder).
7. **PR-7 — Web parity.**
8. **PR-8 — Entitlement hook + polish.**
9. **PR-9 — Typecheck + deploy** (web + mobile OTA + migration + function).
