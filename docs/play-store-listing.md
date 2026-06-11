# Builders Ready — Google Play Store Listing

Use this as your copy-paste reference when filling out the Play Console wizard.
Mirrors the App Store listing but adapted for Play Store formatting and Google's questionnaires.

---

## 1. App details

| Field | Value |
|---|---|
| App name | Builders Ready |
| Default language | English (United Kingdom) — en-GB |
| App or game | App |
| Free or paid | Free (subscription handled outside the app) |
| Category | Business |
| Tags (up to 5) | Construction, Project management, Invoicing, Business tools, Productivity |

---

## 2. Short description (max 80 chars)

```
The client portal UK builders use to look more professional than the competition.
```
(79 chars — just inside the limit.)

---

## 3. Full description (max 4000 chars)

```
Builders Ready is the client portal UK builders use to keep clients informed
and projects on track — without WhatsApp chaos.

Whether you're a sole trader running £15k bathroom refurbs or a multi-PM firm
delivering £400k extensions, Builders Ready turns every job into a professional
client experience.

WHAT YOUR CLIENTS GET
• A branded portal where they can see exactly what's happening on their project
• Timeline of every milestone, decision and update
• Photos of progress, organised by project
• A clear list of decisions waiting on them — no more "did you reply about the
  tile?" texts
• Variations with full breakdown of cost, time impact and reason — so there
  are no nasty surprises at the end
• Invoices they can view and mark as paid
• A handover PDF at the end of the project with everything in one document

WHAT YOU GET
• One dashboard across every project you're running
• Outstanding decisions, unapproved variations and unpaid invoices in one view
• Team members and clients managed in one place
• A handover document generated automatically — no more chasing paperwork
• Push notifications when clients respond
• Works on phone, tablet and web

WHY UK BUILDERS USE IT
• Stop running projects from a 200-message WhatsApp group
• Get variations signed off in writing, not over a coffee
• Look more professional than the builder your client's friend used
• Spend less time on admin, more time on site
• Protect your margin with proper decision logs

PRICING (managed on the web)
• Starter — £29/month — perfect for sole traders and small builders
• Pro — £69/month — for established builders running several projects
• Unlimited — £149/month — for firms with multiple PMs and a steady pipeline

14-day free trial. Cancel anytime.

Subscription billing is handled on our website, not inside the app.

Built in the UK, hosted in the UK/EU. UK GDPR compliant.

Questions? Email info@buildersready.uk
Website: https://buildersready.uk
Privacy: https://buildersready.uk/privacy
Terms: https://buildersready.uk/terms
```

---

## 4. Graphic assets needed

| Asset | Size | Notes |
|---|---|---|
| App icon | 512 × 512 px PNG | Already have — use the same icon as iOS |
| Feature graphic | 1024 × 500 px PNG/JPG | Hero banner — I can generate this; uses same teal/terracotta palette |
| Phone screenshots | min 1080 × 1920 px (portrait), 2–8 images | Take from your iPhone — Play Store accepts iOS aspect ratios |
| 7" tablet screenshots | min 1024 × 600 px, 1–8 images | OPTIONAL but recommended for "Designed for tablet" status |
| 10" tablet screenshots | min 1280 × 800 px, 1–8 images | OPTIONAL — skip if you don't have a tablet |
| Promo video | YouTube URL | OPTIONAL — skip for v1 |

**Screenshot guidance:** the iOS screenshots you submitted to Apple work for the
phone tier on Play Store too. Reuse them. Tablet tiers are optional — skip
unless you have an Android tablet to shoot on, or I render mockups.

---

## 5. Store listing — additional fields

| Field | Value |
|---|---|
| Email | info@buildersready.uk |
| Phone | (leave blank — optional, and you said no personal details) |
| Website | https://buildersready.uk |
| Privacy policy URL | https://buildersready.uk/privacy |

---

## 6. App content questionnaire

### 6a. Target audience and content

| Question | Answer |
|---|---|
| Target age groups | 18 and over |
| Does your app appeal to children? | No |
| Does your app store, collect or share personal information from children? | No |

### 6b. App access

| Question | Answer |
|---|---|
| Is all or part of your app behind a login? | Yes, all functionality requires a login |
| Provide instructions to access restricted content | Provide demo account: reviewer@buildersready.uk / [demo password from iOS submission] — same Heritage Build Co tenant you set up for Apple |

### 6c. Ads

| Question | Answer |
|---|---|
| Does your app contain ads? | No |

### 6d. Content rating

The questionnaire is multi-step. Answer **No** to every question — the app has:
- No violence, sexual content, profanity, drugs, alcohol, tobacco, gambling
- No user-generated content shared publicly
- No location sharing
- No purchases of physical goods

Expected rating: **PEGI 3** / **Everyone**.

### 6e. News app

| Question | Answer |
|---|---|
| Is your app a news app? | No |

### 6f. COVID-19 contact tracing

| Question | Answer |
|---|---|
| Is your app a publicly-available contact tracing or status app? | No |

### 6g. Data Safety form

This is Google's equivalent of Apple App Privacy. Most builders get this
wrong — answer carefully.

**Does your app collect or share any of the required user data types?** YES

**Is all of the user data collected by your app encrypted in transit?** YES

**Do you provide a way for users to request that their data be deleted?** YES
(Settings → account deletion request via support email, per UK GDPR)

#### Data types collected — declare these:

| Data type | Collected | Shared | Optional/Required | Purpose | Why |
|---|---|---|---|---|---|
| **Name** | Yes | No | Required | Account management, App functionality | Owner/PM/client profile |
| **Email address** | Yes | No | Required | Account management, App functionality, Customer support | Login + invitations + notifications |
| **User IDs** | Yes | No | Required | Account management, App functionality | Supabase auth UID |
| **Phone number** | No | — | — | — | Not collected |
| **Address** | No | — | — | — | Not collected |
| **Photos** | Yes | No | Optional | App functionality | Builder posts project photos |
| **App interactions** | Yes | No | Required | Analytics, App functionality | Project timeline events |
| **Crash logs** | Yes | No | Required | App functionality | Expo / Sentry crash diagnostics |
| **Diagnostics** | Yes | No | Optional | App functionality | Performance monitoring |

**Do NOT declare** location, contacts, financial info, health/fitness, messages,
audio files, files & docs (unless you count handover PDFs — they aren't from
the device), web browsing, or installed apps.

**Third-party SDKs used:** Supabase (hosted in EU), Resend (transactional email),
Stripe (web only — not in mobile app). Declare Supabase and Resend in
the data sharing section as **service providers**, not third-party recipients.

---

## 7. Pricing and distribution

| Field | Value |
|---|---|
| Countries | United Kingdom only (or "All countries" if you want broader reach) |
| Pricing | Free |
| Contains ads | No |
| In-app purchases | No |
| Subscription | Declare: "Subscription is managed on our website. Free to download." |

**Reader-app rule note:** Same as iOS — billing is handled outside the app for
B2B SaaS, so we don't need to use Google Play Billing. We're not selling
digital goods consumed inside the app; we're a B2B tool where subscription
gates access to the service. This is permitted.

---

## 8. Release timeline

1. Build AAB locally → upload to Play Console **Internal testing** track first
2. Add yourself as internal tester (your Google account email)
3. Install via Play Store internal test link → verify the production build runs
4. Promote to **Production** track once verified
5. Submit for review — Google review is typically 1–3 days for new apps,
   sometimes 7+ days for first publish

---

## 9. After publish

- App will appear at: `https://play.google.com/store/apps/details?id=uk.buildersready.app`
- Update `apps/web/app/(marketing)/page.tsx` and footer with Play Store badge
- Add Play Store badge image (Google's brand kit at play.google.com/intl/en_us/badges/)

---

## 10. What I need from you to proceed

Once Play Console signup + D-U-N-S verification is done, give me:
1. Your Play Console developer account email
2. Confirm the app shell is created with package name `uk.buildersready.app`

Then I'll walk you through generating the service account JSON key so `eas submit -p android --latest` can upload the AAB automatically.
