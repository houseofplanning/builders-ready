# Builders Ready — Website DESIGN.md

_Design direction for the marketing site. Goal: look built-by-a-builder and
deliberately designed, not like generated SaaS. No UXKIN pulls were used (no
paid sign-in); direction is drawn from real trade/tooling-site patterns plus
the existing brand._

## Direction in one line

A grafter's tool, not a startup brochure. Confident, high-contrast, editorial
and left-aligned. Warm paper instead of cold grey, deep teal instead of
pastel, condensed industrial type, real app screens and real founder voice.
Specific and honest beats vague and polished.

## What we are deliberately NOT doing

The current site's AI-slop tells, removed on purpose: gradient clip-text
headlines, everything centred, three-up identical hover-cards, a generic
"Built in UK / GDPR / Stripe" trust strip, and smooth corporate copy. None of
those appear here.

## Color (role-based)

| Token | Value | Role |
|---|---|---|
| ink | #0B1418 | Primary text, darkest backgrounds |
| teal | #0F4C5C | Primary brand, buttons, links, dark panels |
| teal-900 | #08303B | Deep panel layering |
| accent | #E07A5F | ONE accent — emphasis, rules, highlights (used sparingly) |
| accent-ink | #B8502F | Accent as text on light (contrast-safe) |
| paper | #F3EFE8 | Page background (warm, not grey — kills the pastel-SaaS feel) |
| paper-2 | #EAE4D9 | Alternate band |
| white | #FFFFFF | Cards, app screens |
| muted | #5E7076 | Secondary text (4.5:1 on paper/white) |
| line | #E0DCD2 | Borders on light |
| success/warning/error | #2E7D5B / #B5731F / #C0392B | Status |

Contrast: body and muted meet 4.5:1; white on teal meets AA. No gradient text.

## Typography

- **Display: Barlow Condensed** (700/800), used BIG and tight for headlines, often upper-case. This is the character — industrial, confident, trade.
- **Body + UI: Barlow** (400/500/600/700). Clean, legible, same family DNA.
- Scale (clamped): hero 60–84px, section head 34–46px, sub 18–20px, body 16–17px, label 11–12px upper tracked.
- Body 16px+, line length 60–75ch, line-height 1.5–1.65.

## Spacing & layout

- 8px scale. Section padding 88–120px. Container max 1180px.
- Left-aligned by default (not centre-everything). Asymmetric hero.
- Alternating paper / white / deep-teal bands for rhythm.

## Shape & depth

- Radius: small and sturdy (6–10px), not pill-rounded.
- Depth from borders and flat bands, not drop-shadows everywhere. One soft shadow reserved for the phone device and floating app cards.
- Signature motif: a short 3px accent rule under eyebrows, and hard 1.5px borders on cards.

## Components

- **Primary button:** solid teal, 8px radius, Barlow 600, slight upper tracking. Hover: darken.
- **Secondary / ghost:** teal text, 1.5px teal border, transparent.
- **Cards:** white, 1.5px line border, minimal shadow.
- **App screens:** drawn as real phone mockups (Planning Radar list, on-site quote, invoice) — product truth over illustration.
- **Eyebrow:** 11px upper-case tracked, accent, with a 3px rule.
- Nav: simple, bordered-bottom, wordmark in Barlow Condensed 800.

## Imagery

- Real app screenshots (mocked here in HTML) are the primary imagery.
- PRODUCTION TODO: real photography of actual builders/sites/vans. No stock. This is the one piece the mockup can't fake and where a photographer earns their fee.
- Icons: single thin-stroke line set, consistent.

## Voice (applies to all copy)

Blunt, specific, UK builder-to-builder — the TikTok/email voice. Short
sentences. Real specifics (UK-wide planning data, flat £3 a payment never a %,
14-day trial). NO em-dashes. No invented testimonials or numbers; trust comes
from a real founder note and real product, until real reviews exist.
