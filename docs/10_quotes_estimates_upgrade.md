# Deliverable 10 — Quotes & Estimates upgrade: beating Price A Job / EstimatorXpress

**Date:** 2026-10-10
**Status:** Research brief + build plan (roadmap, not for immediate build)
**Scope:** How the incumbent estimating tools work, why builders still rely on them despite dated UIs, and a concrete, phased plan (with data model) to make the Builders Ready **Quotes & Estimates** tab better — on both web and the app.

---

## 0. The one-paragraph version

Builders keep using tools like **Price A Job** and **HBXL EstimatorXpress** not because the software is modern — it isn't — but because of two things the tools *own*: a library of **build-ups (assemblies)** that know what physically goes into a wall, a roof, a foundation; and a **maintained material-price library** priced at "today's prices." That domain knowledge is the moat, not the interface. Builders Ready today has a clean, mobile, on-site estimator — but it's **flat manual line items** with no price library and no assemblies; our "templates" only seed the project *timeline*, not the quote content. The opportunity is to build the assembly + price-library engine (the thing that's hard and valuable), keep it **current** (their weakness), and layer it **on top of our existing estimate line items** so a builder can produce a full, costed extension quote on their phone in minutes — then do what the incumbents can't: turn that quote into a signed job, a managed project, and a paid invoice in the same app.

---

## 1. What Price A Job actually provides, and how

Price A Job (priceajob.co.uk) is a **cloud-based** construction suite with five modules — Estimating, Project Management, Building Regulations, Engineering, Accounting — sold separately (Estimating from **£35.95/mo**) or bundled ("All Included" ~£89.75/mo). The estimating module is the relevant one.

**How the estimate is built — element calculators.** Rather than a blank line-item sheet, the estimator is organised into **building-element categories**, each containing **calculators** you fill in with dimensions and specification choices. The published category list:

> Legal Fees (architect, building control, planning, structural engineer, designer) · Preparation (demolition, site equipment, temporary fencing, scaffolding) · Drainage (soakaway, drain runs, Aco channels, manholes) · Landscaping (driveway, pathway, fences/gates, turf, kerbs) · Foundation (strip, trench, pad) · Ground floor (concrete, block & beam, timber) · Walls (masonry/timber cavity, block, brick, stud, columns, below DPC) · Roof (structure, covering, insulation, windows, fascia/soffit, rainwater) · Structural Members (padstone, beams — steel, flitch, glulam, timber, ply-web) · Openings (windows, doors — uPVC, composite, bifold, French, sliding, garage) · Carpentry (interior doors, staircase, handrail, skirting, architrave) · Electrics · Plumbing · Heating (boilers, radiators, UFH, cylinders) · Fixtures & Fittings (kitchen) · External Finishes (render, cladding) · Internal Finishes (wall/floor/ceiling finishes, tiling, paint).

You pick, say, **Masonry Cavity Wall**, enter the dimensions, and the calculator **expands it into quantified materials + labour** and prices them. Chain the calculators from foundation up to roof (plus prelims and legal fees) and you get a complete, itemised quote. Their pitch is "**Accurate estimate. 15 minutes. Today's prices.**"

**How prices stay current.** It claims to operate "**in-sync with nationwide construction suppliers**" with "**prices updated nightly**." This is the core value: the builder doesn't maintain a price book; the platform does.

**Outputs.** Branded quotes/estimates and schedules, exportable to other document formats. (They also show sample reports.)

**Shape of the business:** cloud, cross-device, monthly SaaS, UK-tailored, no card for the demo.

## 2. The archetype builders mean — HBXL EstimatorXpress

Worth including because it's the "dated but trusted" benchmark, and the one most UK builders name. *(Pieced together from trade press and review sites, some dated — treat vendor stats as vendor claims.)*

- **Two starting points:** hundreds of **pre-loaded quote templates** (roofs, extensions, wall-finish permutations) **or** build from scratch. Assembly libraries model foundations, roofs, extensions, etc.
- **Live material prices:** linked to UK builders' merchants; a "**Price Tracker**" keeps prices up to date, and a live link to merchants such as **Travis Perkins** and **Keyline** is an optional extra. It can price at **today's cost and the job start-date cost** (matters during price rises).
- **Depth:** "calculates every single hour, every last nail and tube of mastic," and knows the **plant** needed and for how long. Overheads, wastage and inflation added as **percentages**.
- **Outputs:** 80+ job-management reports (cost reports, task lists, materials order schedules, cashflow/profit), export to Excel/Word.
- **Delivery & price:** Windows **desktop**, step-by-step wizards, onboarding session included; **~£899/yr + VAT** (or ~£1,999 perpetual). Dated UI, real learning curve.

**Why both are still used despite being dated:** the *estimating intelligence* — the assemblies and the maintained prices — is genuinely hard to reproduce and saves hours per quote. Builders tolerate clunky, Windows-only, expensive software because the number that comes out is **trustworthy**. That is the bar we have to clear.

---

## 3. Where Builders Ready stands today (the honest gap)

From our own schema (`packages/shared/src/estimate.ts`, `types.ts`, `stages.ts`):

- **Estimator = flat manual line items.** `estimate_line_items` carry `kind` (`material` / `labour_day_rate` / `labour_hourly` / `fixed` / `other`), `quantity`, `unit_cost_pence`, `markup_percent`, with DB-generated `line_cost_pence` / `line_price_pence`, VAT modes and live margin. Solid money engine — but the builder **types every price in by hand**.
- **No material cost library.** Nothing to pick a priced item from; no "today's prices."
- **No assemblies.** Nothing expands "cavity wall, 40 m²" into its materials + labour.
- **"Templates" ≠ quote content.** `PROJECT_TEMPLATES` (extension, loft, kitchen, etc.) only seed the **project timeline/stages** (`project_type`). Picking "Extension" gives you the right *stages*, not a pre-built *quote*.

**What we already have that the incumbents don't:** on-site mobile quoting, branded PDF, client e-sign, quote→project conversion, staged invoices, Stripe payments, handover PDF, and the marketplace. They are **estimate-only**; we are **end-to-end**. That's the wedge.

So the task isn't to rebuild our estimator — it's to **add the intelligence layer** (price library + assemblies + real quote templates) **on top of the line-item engine we already trust.**

---

## 4. How we make it better — product strategy

Five bets, each a place the incumbents are weak:

1. **Assemblies that expand into our existing line items.** The build-up engine is the moat. But an assembly shouldn't be a black box — it should generate ordinary, editable `estimate_line_items` the builder can override. Best of both: speed *and* control.
2. **A maintained, visibly-current price library.** Their big vulnerability (your builders' own words: "outdated templates"). We win on freshness and honesty: every price shows **"priced as of <date>"**, a one-tap **"refresh to today's prices"**, and a **regional index** so a London job isn't priced like a Hull one. Builders can override any price with their **own negotiated merchant rate**, saved to their rate book.
3. **Real project quote templates.** e.g. **Single-storey extension**, **Loft conversion**, **Bathroom refit** — a bundle of assemblies pre-wired with typical quantities. Enter a few key dimensions → a full draft quote in minutes, then tweak. This is the headline feature and directly answers the roadmap item.
4. **Mobile-first, on-site.** Their tools are desktop (HBXL) or desktop-leaning. Ours builds the quote **standing in the customer's kitchen** and sends it before leaving. Web is for library/template management and detailed editing; the app is for fast on-site build + send.
5. **One app, whole job.** The quote isn't the end — it's signed, becomes a project, gets invoiced and paid, and ends in a handover PDF. No incumbent closes that loop.

**Positioning line:** *"The estimating brain of the old tools — current prices, real build-ups, proper templates — on your phone, and it turns the quote into the job and the money."*

---

## 5. Data model (deep)

Everything below is **additive** — the existing `estimates` / `estimate_line_items` tables and money maths stay exactly as they are. Assemblies are a **generator** that writes into `estimate_line_items`; the builder can then edit freely.

### 5.1 Price library (platform-owned, versioned)

```
material_items                      -- the catalogue (platform-maintained)
  id            uuid pk
  code          text unique         -- e.g. 'BRK-FACING-STD'
  name          text                -- 'Facing brick (standard)'
  element_category text             -- 'walls' | 'roof' | ... (matches §1 taxonomy)
  unit          text                -- 'nr' | 'm' | 'm2' | 'm3' | 'tonne' | 'bag' | 'each' | 'hour'
  base_unit_cost_pence int          -- current national-average cost, ex-VAT
  vat_rate      numeric             -- usual VAT treatment hint
  supplier_ref  text null           -- optional merchant SKU for future feeds
  active        boolean

material_price_history              -- freshness + "as of" + start-date pricing
  id            uuid pk
  material_id   uuid fk
  unit_cost_pence int
  effective_from date
  source        text                -- 'curated' | 'merchant_feed' | 'manual'

region_price_index                  -- regional multiplier (London 1.15, NE 0.92, ...)
  region        text pk             -- postcode-area group
  labour_index  numeric
  material_index numeric
```

### 5.2 Labour & plant rates

```
labour_rates            -- platform defaults by trade
  trade         text pk  -- 'bricklayer' | 'labourer' | 'carpenter' | 'electrician' | ...
  unit          text     -- 'hour' | 'day'
  base_rate_pence int

plant_items             -- hired plant/equipment (mirrors material_items)
  id, code, name, unit ('day'|'week'), base_cost_pence
```

### 5.3 Per-tenant overrides (the builder's own rate book)

```
tenant_material_prices  (tenant_id, material_id, unit_cost_pence, updated_at)   -- their merchant price
tenant_labour_rates     (tenant_id, trade, unit, rate_pence)                    -- their gang rates
tenant_default_markup   (tenant_id, element_category, markup_percent)           -- their usual margin per trade area
```
Resolution order when pricing a component: **tenant override → regional-indexed base → base.**

### 5.4 Assemblies — the "calculators"

```
assemblies                          -- platform-owned build-ups, versioned
  id            uuid pk
  key           text                -- 'wall_masonry_cavity'
  name          text                -- 'Masonry cavity wall'
  element_category text             -- 'walls'
  measure_unit  text                -- the thing the builder measures: 'm2'
  inputs_schema jsonb               -- dimensions/options this calculator asks for
  version       int
  notes         text

assembly_components                 -- the recipe: per 1 measure_unit of assembly
  id            uuid pk
  assembly_id   uuid fk
  component_type text               -- 'material' | 'labour' | 'plant'
  material_id   uuid null           -- when material/plant
  trade         text null           -- when labour
  qty_per_unit  numeric             -- e.g. 60 bricks per m2
  waste_percent numeric             -- e.g. 5
  formula       text null           -- optional, for inputs-driven qties (see below)
```

`inputs_schema` example for a cavity wall:
```json
{ "fields": [
  { "key": "area_m2", "label": "Wall area", "unit": "m²", "type": "number" },
  { "key": "skin", "label": "Outer skin", "type": "select",
    "options": ["facing_brick","render_block","stone"] },
  { "key": "insulation", "label": "Cavity insulation", "type": "select",
    "options": ["full_fill_100","partial_fill_75","none"] }
] }
```
Components can reference inputs via `formula` (e.g. bricks = `area_m2 * 60`), so one assembly covers many permutations instead of needing a template per variant — the thing HBXL does with "countless permutations," but data-driven.

### 5.5 Quote templates — project bundles

```
quote_templates                     -- platform + tenant-saved
  id            uuid pk
  tenant_id     uuid null           -- null = platform template, else builder's own
  key           text                -- 'single_storey_extension'
  name          text                -- 'Single-storey rear extension'
  project_type  text                -- links to PROJECT_TEMPLATES (timeline) so quote + stages stay aligned
  version       int

quote_template_items                -- which assemblies, with starting quantities
  id            uuid pk
  template_id   uuid fk
  assembly_id   uuid fk
  default_inputs jsonb              -- sensible starting dimensions
  sort_order    int
```

This is the join that finally makes "pick Extension → get a real draft quote **and** the right timeline" true, because `quote_templates.project_type` reuses the existing `PROJECT_TEMPLATES` keys.

### 5.6 Linking generated lines back to assemblies

Add to the existing `estimate_line_items`:
```
source_assembly_instance_id uuid null   -- which assembly instance produced this line
is_locked                   boolean default false  -- builder edited it; don't overwrite on refresh
```
And a light instance table so edits can re-expand / re-price:
```
estimate_assembly_instances
  id, estimate_id, assembly_id, assembly_version, inputs jsonb, created_at
```

**The flow, end to end:**
pick quote template → instantiate its assemblies with default inputs → builder adjusts a few dimensions → engine expands each assembly through `assembly_components × resolved prices × (1+waste) × markup` into `estimate_line_items` → builder tweaks any line (those get `is_locked`) → normal estimate totals/VAT/margin (unchanged) → PDF → e-sign → project (seeded by `project_type`) → invoices → paid. "Refresh to today's prices" re-prices only **unlocked** lines and stamps a new "as of" date.

---

## 6. UX — web vs app

**Web (manage + detailed build):**
- **Rate book** screen: browse the price library, set tenant overrides, set gang rates and default markups per element category.
- **Template manager:** clone a platform quote template, tweak assemblies/quantities, save as the builder's own.
- **Full estimate editor:** assemblies and raw lines side by side; "add assembly" picker; re-price / refresh controls; the existing line editor stays.

**App (fast, on-site):**
- **Start a quote → "From a template"** (Single-storey extension, Loft, Bathroom…) or "Blank."
- A short **calculator form per assembly** (2–5 inputs each — deliberately far simpler than the incumbents' dense screens), live running total as you type.
- Generate → review the itemised quote → tweak → **send for signature** before leaving site.
- Everything mobile-first; heavy library editing stays on web.

Design principle: **the incumbents expose their complexity; we hide it.** A builder should answer "how big is the wall?" not "which of 11 wall calculators and 30 fields?"

---

## 7. Keeping prices current (the differentiator, done honestly)

The incumbents claim nightly/merchant-linked prices; the builders you spoke to say the templates feel outdated anyway. We beat that on **transparency + control**, not by over-promising a magic live feed on day one:

1. **Curated UK price library** seeded from a recognised cost basis and refreshed on a schedule we actually keep. Every item carries an **"updated <date>"**.
2. **Regional index** so prices reflect where the job is.
3. **Builder overrides** — their real merchant prices, saved once, reused everywhere. (Most trust *their own* numbers most.)
4. **"Priced as of" on every quote** + **one-tap refresh**, and optional **start-date pricing** (price the job for when it starts, not just today) — matching HBXL's best idea.
5. **Later:** optional **merchant price feed** (Travis Perkins / Jewson / Selco style) as a premium add-on, exactly how HBXL monetises Price Tracker.

Honesty note: a genuinely automated national price feed is a licensing/data project in its own right. v1 should be a well-maintained curated library + strong override UX; that already beats "outdated templates," without claiming a feed we don't have.

---

## 8. Phased build plan

| Phase | What ships | Why first | Rough size |
|---|---|---|---|
| **A — Rate book** | `material_items`, `labour_rates`, tenant overrides; a "pick a priced item" control in the existing line editor (unit cost auto-fills); "updated <date>" shown. | Immediate win, low risk, no assemblies yet. Builders stop typing prices. | S–M |
| **B — Assemblies engine** | `assemblies` + `assembly_components` + instance link + expansion into line items; top ~10 assemblies (walls, foundations, ground floor, roof, plastering, tiling, kitchen, bathroom, doors/windows, electrics-basic). | The moat. Delivers "enter a dimension → costed build-up." | L |
| **C — Quote templates** | `quote_templates` + items; platform bundles for **single-storey extension, loft, bathroom, kitchen**; app "From a template" flow; saves as builder's own. | The headline roadmap feature; needs A+B underneath. | M |
| **D — Freshness** | `material_price_history`, regional index, refresh-to-today, start-date pricing. | Turns "current prices" into a real, visible promise. | M |
| **E — Outputs** | Materials order schedule + cost report (not 80; the few that matter), Excel export. | Reaches feature-parity talking points for switchers. | S–M |
| **F — later/premium** | Merchant price feed; plant scheduling; AI "describe the job → draft assemblies." | Monetisable add-ons once the core is trusted. | — |

Sequencing logic: **A is useful on its own** and de-risks everything; **B** is the hard core; **C** is what you market. D/E make it defensible against switchers.

---

## 9. How this changes the roadmap entries

The two items we logged become more precise:

- **"Quote templates v2"** = Phases **A → B → C** (price library → assemblies → project bundles). The "up-to-date material costs" part is Phase A + D; "actual templates (e.g. single-storey extension)" is Phase C.
- A new explicit item: **"Material cost library (rate book) + regional pricing"** (Phase A/D) — the backbone that makes everything above "current."

---

## Sources

- [Price A Job — home](https://www.priceajob.co.uk/) · [Estimating product](https://www.priceajob.co.uk/products/estimate) · [Estimating module explainer / calculators](https://www.priceajob.co.uk/software/product/estimate) · [FAQ](https://www.priceajob.co.uk/faq) · [Pricing](https://www.priceajob.co.uk/pricing)
- HBXL EstimatorXpress: [Professional Builder feature](https://probuildermag.co.uk/?p=14901) · [PBC Today](https://www.pbctoday.co.uk/news/planning-construction-news/prudent-builders-take-less-time-accurate-hbxls-estimatorxpress/22053/) · [Rooks Construction case study](https://probuildermag.co.uk/?p=44075) · [Capterra listing](https://www.capterra.com/p/126437/EstimatorXpress/) · [FitGap listing](https://us.fitgap.com/products/036104/estimatorxpress)
- Internal: `packages/shared/src/estimate.ts`, `packages/shared/src/types.ts` (EstimateLineKind), `packages/shared/src/stages.ts` (PROJECT_TEMPLATES), `supabase/migrations/20260519000015_estimates.sql`, `.../20260519000022_project_type.sql`
