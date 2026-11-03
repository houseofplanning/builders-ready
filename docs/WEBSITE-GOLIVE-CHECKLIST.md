# Builders Ready website rebrand — before we go live

_Last updated: 2 Nov 2026._
_The new site is prototyped as standalone HTML files in the outputs folder (home, features, planning-radar, pricing, homeowners). These are the design + layout spec. Below is everything that must happen before it replaces the live buildersready.uk._

## Pages built (prototype)
- Home · Features · Planning Radar · Pricing · For homeowners — all in the new design system (warm paper, single teal accent, left spine, edge-aligned chrome + mobile hamburger, quiet scroll motion). Each page has its own layout; only the home page uses the two-phone hero.

## Assets — real vs produced
- **Real app screenshots** (good to ship): hero project/finance screens, Quotes (with the star), staged Contract, Invoices, Client portal/updates, trades Marketplace "Find Work", Planning Radar results + job detail, the two homeowner screens (Post a job, Home). All normalised to a clean 9:41 status bar.
- **Produced / illustrative (not real), needs a decision:**
  - **Planning Radar jobs carousel** — the scrolling UK job cards are styled HTML with made-up addresses, not real data. Fine as a marketing visual, but it's designed, not a live feed. Decide: keep as illustrative, or wire to real sample data.
  - **Web dashboard** — ✔ redesigned in the app code (calm, number-led KPI tiles; the four coloured tints + icon badges removed; charts were already teal-restrained). Files: `apps/web/app/[slug]/dashboard/dashboard-visuals.tsx` + `page.tsx`. **Still to do:** typecheck + deploy, then take a fresh real screenshot of the live dashboard and swap it onto the Features page (the current Features image is the old sloppy one). Preview of the redesign: `outputs/builders-ready-dashboard-redesign.html`.

## Still needed from Oddie
- A **real on-site / build photo** (or a few) if we want the full-bleed image hero direction on any page.
- Decision on the **founder/about** content (photo + words) if we add an About page later — the founder quote was removed for now.

## Engineering — to actually deploy
- Rebuild these prototype pages as real **Next.js marketing routes** in `apps/web/app/(marketing)/` (the HTML is the spec). Don't ship the raw prototype files.
- **Typeface:** the prototype uses a system-font stack as a stand-in. Choose and implement the real brand font (a warm humanist/grotesk sans) and load it properly.
- **Wire the buttons/links:** Start free → /signup, Log in → /login, Post a job → homeowner signup, etc. (all dummy in the prototype).
- **Images:** prototype embeds images as base64. In the real build, use optimised image files / next/image for performance.
- **Legal:** Privacy AND Terms pages rebuilt in the new style with the entity corrected to Builders Ready Ltd (17551960, 66 Paul Street) — the old "Mehraj Consultancy Ltd" is gone from both. Have a solicitor glance over both before launch.
- **✓ Resolved (card at signup):** signup DOES collect a card. The "no card needed" marketing claims have been removed from the homepage, features and pricing pages, so the marketing now agrees with Terms §5 ("card collected at signup, not charged during the trial"). The "no card payment fees" lines remain — those correctly describe the Unlimited tier waiving the £3-per-card fee.
- **Blog:** index page built with all 25 real posts; the post *cards* link to `#` placeholders — wire each to its real `/blog/<slug>` article when rebuilt in Next.js.
- **Store badges:** the homepage App Store / Google Play buttons use the real store links (apps.apple.com/.../id6771347066 and play.google.com/.../uk.buildersready.app). Custom-rendered to match the design; swap for Apple/Google's official badge art at build time if you prefer the standard look.
- **Responsive QA** on real phones/tablets (hamburger, carousels, phone clusters, tables).
- **Light/dark, accessibility, contrast** pass.

## Nice-to-have before or soon after launch
- About page, Blog index in the new style.
- Analytics / pixels for the marketing plan (CAC tracking).
- OG/social preview images per page.

## Order suggestion
1. Redesign the web dashboard (so its screenshot is on-brand). 
2. Get a site photo if going for the image hero.
3. Rebuild pages as Next.js routes + real font + wired links.
4. Legal + responsive/accessibility QA.
5. Ship.
