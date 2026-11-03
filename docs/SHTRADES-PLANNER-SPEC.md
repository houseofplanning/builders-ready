# SH Trades Property Planner — Build Spec

_Last updated: 20 Oct 2026. Owner: Oddie. Status: planning (pre-build)._
_Home: shtrades.co (Vercel). Delivered as an add-on to Builders Ready._

This spec exists because the first throwaway prototype was the wrong approach
(blocky 3D massing, no dimensions, no drawing, no drag-and-drop). It sets out,
methodically, what the tool must do, benchmarked against Planner 5D, and a
phased build plan with the right architecture so we build it properly this time.

---

## 1. What Planner 5D actually is (from reviewing their site)

Planner 5D is a 15-year-old, 100M-user, VC-scale product. We are not matching it
feature-for-feature; we are replicating its **core workflow** and beating it on
the things that matter to a UK builder. Understanding it properly first:

**Core workflow.** You draw a floor plan (or upload/scan an existing one), with
**real measurements**. You switch freely between a **2D plan view and a 3D view**
of the same model. You **drag and drop** furniture and fixtures from a large
library (they quote 8,000+ items) into each room. You set materials, textures,
colours and lighting. You produce **4K photoreal renders** and **360°
walkthroughs**.

**Everything is dimension-driven and per-room.** Rooms carry real area; you work
on a specific space (kitchen, bathroom, bedroom, garage) with dedicated planners
for each. There is a **roof designer** (shapes, slopes, materials). It is
multi-level (storeys).

**The feature surface they advertise:**
- Draw floor plan from scratch, or **AI plan recognition** (photo/scan of a plan → editable digital plan → 3D).
- 2D ⇄ 3D of one model, with real measurements.
- Drag-and-drop furnishing from an 8,000+ item catalogue.
- Per-room planners: kitchen, bathroom, bedroom, garage, office, landscape, deck, garden.
- Roof design (shape, slope, materials).
- Materials / textures / colour / lighting / time-of-day.
- 4K photoreal renders; 360° walkthrough; AR; VR (Vision Pro).
- **Smart Wizard** (auto-generate room layouts) + **Automated Furniture Arrangement** + AI room design.
- **Shopping list / cost estimate** (budget vs luxury) and a repair-cost estimator.
- Collaboration (design together), mood boards, templates/ready home plans gallery, import custom 3D models.
- Cross-platform (web, iOS, Android, Windows, macOS, VisionOS) with cloud sync.

**Honest read on scale.** The catalogue, the AI features, photoreal rendering and
the five native platforms represent years of work and a real team. We should not
pretend to ship all of that. We win by being **narrow and builder-focused**, see
section 3.

---

## 2. What ours must do (requirements, from Oddie's feedback)

Non-negotiables that the prototype failed:

1. **Pick a property type** to start: detached, semi-detached, terraced, end-terrace, bungalow.
2. **Type in real dimensions** (ground floor and upstairs) and get an initial dimensioned plan/visual from them.
3. **A proper 2D floor plan** as the heart of the tool, showing dimensions, that you can **drag, drop and resize**.
4. **Add an extension by entering its size**, and it appears on the plan and the 3D.
5. **Open an individual room (e.g. the kitchen) and place specific things into it** (units, island, appliances) and see what it does to the space.
6. **3D generated from the plan** (so roof and walls always fit, rooms never overlap) — not hand-placed blocks.
7. The things Planner 5D limits that we allow: **see inside**, **garage conversions**, **loft conversions**, interior/structural detail.

---

## 3. How we win (our differentiators)

We are a **builder's** design tool, not a decor toy. The spine is the same
(dimension-driven plan → 3D), but:

- **Real UK build-cost pricing** that updates live and becomes an actual Builders Ready quote (design → priced quote → job). Planner 5D stops at a rough shopping list.
- **Conversions and remodels as first-class**: garage conversion, loft conversion, knock-through, rear/side/wrap extension, each with the build implications, not just decor.
- **See inside always**, structural view, trade-relevant detail.
- **Extension-by-dimension** aimed at how a builder actually scopes a job.
- Tight integration with the rest of Builders Ready (one login, the design flows into quoting, contracts, scheduling).

We are explicitly **not** building (at least not early): AI plan recognition,
photoreal 4K rendering, AR/VR, five native platforms, an 8,000-item decor
catalogue. Those are later, partner, or never.

---

## 4. Architecture

A proper web app, not a single file.

- **Stack:** Next.js + React + TypeScript on Vercel (same as Builders Ready), hosted on shtrades.co.
- **Backend / auth:** Supabase, shared with Builders Ready so a BR subscriber signs in once and projects/entitlement carry across. Projects saved per user.
- **The model is the single source of truth.** Both the 2D editor and the 3D view read and write the same document:

```
Project
  Levels[]            (Ground, First, ...)
    Walls[]           (start{x,y}, end{x,y}, thickness, height)
    Rooms[]           (polygon derived from walls, name, type, area)
    Openings[]        (door/window on a wall, position, size)
    Items[]           (catalogue ref, position, rotation, per room)
    Stairs[]
  Roof                (type: gable/hip/flat, pitch, per building outline)
  Meta                (property type, address, created/updated)
```

- **2D editor:** an interactive canvas (Konva.js / react-konva) for drawing and dragging walls, rooms and items, with **grid snapping, live dimension labels, and undo/redo**.
- **3D view:** generated from the model with Three.js + React Three Fiber + drei. Walls extruded to height; **openings cut with CSG** (`three-bvh-csg`); roof generated from type + pitch; items rendered as glTF models. Orbit + first-person walkthrough + see-inside toggle.
- **Catalogue:** glTF models (kitchen units, bathroom, bedroom, living, doors/windows), categorised, start small and grow. Free/CC asset packs first, bought packs later.
- **Pricing engine:** every element (wall m², room m², opening, item, conversion, extension) maps to a cost; totals live; export bridges into the Builders Ready quote/price engine.

---

## 5. Phased build plan

Each phase is a shippable milestone, reviewed before the next. Nothing is
released publicly until the whole thing is good enough; these are internal gates.

**Phase 0 — Foundations.** Scaffold the Next.js app on shtrades.co; Supabase
project + auth shared with BR; the document model above; project create /
save / load; app shell (toolbar, left tools, right properties panel). _Outcome:
an empty editor that persists a project._

**Phase 1 — 2D floor plan editor (the heart).** Property-type presets that seed a
starting plan; **type-in dimensions** for the building and per room; draw walls;
**drag to move, drag handles to resize**; rooms auto-detected from enclosed walls
with **live area + dimension labels**; grid + snapping; undo/redo; name/label
rooms; **add extension by entering size**. _Outcome: a builder can lay out a real,
dimensioned plan and reshape it. This is the milestone that proves the approach._

**Phase 2 — Openings, stairs, storeys.** Doors and windows placed on walls;
multi-level (ground + first + loft) with a level switcher; stairs; copy a level.
_Outcome: a complete multi-storey dimensioned plan._

**Phase 3 — 3D generated from the plan.** Walls extruded; openings cut (CSG);
**roof generated** by type and pitch that actually fits; floors/ceilings; orbit,
walkthrough and **see-inside**. _Outcome: press a button, get a correct 3D of the
plan you drew._

**Phase 4 — Catalogue + drag-drop furnishing + conversions.** Item library;
**place / move / rotate items in 2D and 3D**; **per-room fit-out (kitchen units,
bathroom suite, etc.)**; **garage and loft conversions** as guided actions.
_Outcome: you can work on the kitchen and furnish rooms._

**Phase 5 — Materials + presentation.** Textures, colours, finishes, lighting;
good real-time visual quality; shareable view/export (image/PDF). Photoreal 4K
is deferred (own render pipeline or partner).

**Phase 6 — Pricing bridge to Builders Ready.** Map every element to UK build
costs; live project cost; **export the design as a priced Builders Ready quote /
project**. This is the differentiator that makes it a builder tool.

**Phase 7 — Later bets.** Templates/home-plans gallery; AI plan recognition
(upload a plan → digitise); collaboration; mobile.

---

## 6. Tools / libraries per phase

| Need | Tool | Build vs buy |
|------|------|--------------|
| App + hosting | Next.js on Vercel (shtrades.co) | Build |
| Auth / storage / entitlement | Supabase (shared with BR) | Build |
| 2D editor canvas | Konva.js / react-konva | OSS |
| Room/polygon geometry | custom + polygon-clipping lib (e.g. martinez) | OSS |
| 3D view | Three.js + React Three Fiber + drei | OSS |
| Window/door openings in 3D | three-bvh-csg | OSS |
| Furniture/fixture models | glTF asset packs (free/CC first, bought later) | Buy/curate |
| Photoreal render (Phase 5+) | own pipeline or 3rd-party render service | Later / partner |
| Pricing | Builders Ready price engine + UK cost data | Build |

---

## 7. Honest expectations

- This is the multi-month build, done in stages. **Phase 1 is the first real milestone** and the one to get right before anything else; it is where the prototype failed and where the product lives or dies.
- We replicate Planner 5D's *workflow*, not its 15 years of catalogue, AI and rendering. Our edge is pricing-into-a-quote and conversions, not decor breadth.
- Build velocity depends on capacity beyond these sessions (same open question as the main roadmap).
- Recommendation: green-light **Phase 0 + Phase 1** only, build the dimensioned floor-plan editor, review it, then proceed. No more guessing at the whole thing at once.

---

## 8. Open decisions

1. Confirm floorplan-first architecture (section 4) is the agreed approach.
2. Confirm shtrades.co Vercel project + shared Supabase as the home.
3. Green-light Phase 0 + 1 as the first build, reviewed before Phase 2.
4. Metric units only, or imperial too? (Builders often mix.)
5. Catalogue source for Phase 4 (free/CC vs bought packs) — decide nearer the time.
