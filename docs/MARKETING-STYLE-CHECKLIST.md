# Marketing site — style checklist

The homepage rebrand is the reference. Every marketing page must follow these,
which are the fixes we worked through on the homepage so they don't have to be
re-flagged page by page. Most are enforced in code by the shared primitives in
`components/marketing/ui.tsx` — use those rather than re-rolling layout.

1. **Warm palette only.** `bg-paper` / `bg-paper-alt`, `border-hairline-warm`,
   text in `ink-warm` / `ink-soft-warm` / `ink-muted-warm`, one `primary` teal
   accent. Never the cool app tokens (`canvas`, `hairline`, `ink`, `ink-muted`)
   and never gradient text or gradient heroes.
2. **Hanken Grotesk** (global). Headings heavy + tight tracking.
3. **Real screenshots, shown in-frame.** No hand-drawn CSS "mockups".
4. **Media sized by height, not width,** inside a responsive container
   (`h-[400px] sm:h-[480px] lg:h-[560px]` style) so it scales down proportionally
   and never overflows into the next section.
5. **Centred content, equal margins.** Shared rail: `mx-auto max-w-[1600px]
   px-6 sm:px-10`. Full-bleed only for nav, footer and carousels.
6. **No decorative bubbles / blobs / gradient fluff.**
7. **"Every UK trade"** framing — never a named-trades list as the pitch.
8. **No AI tells** — no "Built in the UK" sign-off, no feature-gate boasting,
   no em-dash stuffing.
9. **Restrained motion** (`br-float`, `br-marquee`), honouring reduced-motion.
10. **UK English** everywhere (colour, optimise, centre…).
11. **Two-phone hero cluster is homepage-only.** Other pages get their own hero.
12. **Consistent CTA / eyebrow / check-list** styling (shared primitives).

Routes: `/`, `/features`, `/planning-radar`, `/pricing`, `/homeowners`,
`/about`, `/blog`. Nav + footer link to all of them, so all must exist.
