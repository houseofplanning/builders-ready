# Builders Ready — cold prospecting email

## Subject lines (A/B test 2–3)
1. Quote, run and get paid for every job — one app
2. For builders whose jobs live on WhatsApp
3. A client portal built for UK builders
4. {{first_name}}, worth a look for {{company}}?

**Preview text:** Quotes signed on site, staged payments to your bank, and a clean handover — without the WhatsApp chaos.

## Merge fields used
- `{{first_name|there}}` — falls back to "there" if unknown
- `{{company}}` — optional, subject line 4
- `{{unsubscribe_url}}` — Resend injects this; required
- Hero image URL: `https://buildersready.uk/email/coldemail_hero.png` — **upload `coldemail_hero.png` to that path first** (or swap for wherever you host it)
- Demo link points to `cal.com/buildersready/demo` — swap for your real booking link

## Before you send (cold email is a deliverability minefield — this matters)
- **Only email business addresses** (info@, the company domain). Under UK PECR, unsolicited B2B email to corporate subscribers is allowed *if* you identify yourself and give a working opt-out — both are in the footer. Add your registered address where marked.
- **Send from your own domain via Resend**, not Gmail. Make sure SPF, DKIM and DMARC are set for buildersready.uk (this is the fix for the Gmail 50-cap/silent-spam problem). I can set these up for you.
- **Warm up**: don't blast. Start ~20–30/day and build up over 2–3 weeks. A brand-new sending pattern of hundreds of cold emails will get flagged.
- **Keep it light**: one image, lots of real text (this email is built that way). No attachments, no link shorteners.
- **Personalise line 1** where you can — even just the trade or town lifts reply rates a lot.
- Expect low single-digit reply rates on cold; the demo CTA + "reply for a 2-min video" gives two ways to respond.

## Files
- `cold_prospecting_email.html` — the email (Resend-ready)
- `coldemail_hero.png` — hero image to host
