# Apple Review — Response to Rejection

**Submission ID:** e4ce9507-91cb-4bb5-8ad2-c9cc0bac8d95
**Guideline cited:** 3.1.1 / 3.1.3(c) — In-App Purchase / Enterprise Services
**Date received:** 22 May 2026

---

## What Apple is saying

> The app offers enterprise services that are sold directly to organizations or groups of employees or students. However, these same services are also available to be sold to single users, consumers, or for family use without using In-App Purchase.

Apple's reviewer read "sole trader" in our listing copy as "individual consumer," and concluded we offer the service to consumers too. They want us to either restrict to organizations only or add IAP for individual users.

## Our position

Builders Ready is a B2B service sold exclusively to **builder businesses**.

- Even the Starter tier is purchased by a builder operating as a registered business (sole trader is a UK business structure regulated by HMRC, not a consumer category — equivalent to a US LLC/sole proprietor)
- Every account in the system is tied to a tenant representing a builder business
- Clients (homeowners receiving construction work) do NOT pay — they are invited by the builder
- There is no individual/consumer purchase flow anywhere in the app or on the web
- Subscriptions are managed exclusively by the business on the web at buildersready.uk
- The app does not sell, unlock, or upgrade any digital content or features in-app — it provides access to the business's existing subscription

We fall squarely under 3.1.3(c). We will update our App Store description to remove any wording that could be read as consumer-targeted, and we will make the B2B nature explicit.

---

## Reply to paste into App Store Connect

> Thank you for the feedback.
>
> We'd like to clarify and respectfully request reconsideration under guideline 3.1.3(c).
>
> Builders Ready is a B2B service sold exclusively to builder businesses operating in the United Kingdom construction industry. Every subscription is purchased by a registered business — including sole traders, who in the UK are a regulated business structure under HMRC, not an individual consumer category. There is no individual, family, or consumer purchase flow anywhere in the app or on our website. Clients (homeowners receiving construction work) are invited by the builder business and pay nothing to use the app.
>
> The app itself contains no purchase or upgrade flows — it provides access to the business's existing subscription, which is managed entirely on the web at https://buildersready.uk. The mobile app does not sell digital goods or content of any kind.
>
> We have updated the App Store description to make this B2B-only positioning explicit. We have removed any phrasing that could be misread as consumer-facing and clearly state that subscriptions are managed by the business on the web.
>
> For verification, the reviewer demo account (reviewer@buildersready.uk) represents a builder business (Heritage Build Co), not an individual consumer.
>
> We believe the app fully complies with 3.1.3(c) and respectfully ask for reconsideration. We are happy to provide any additional information.
>
> Thank you for your time.

---

## Updated App Store description

Paste this into App Store Connect → App Information → Description (replace the existing description). This is the **only change needed**; no new binary required.

```
Builders Ready is a B2B client portal for UK builder businesses — the
professional tool builders use to manage construction projects and keep
their clients informed.

Built for builder businesses of every size, from registered sole traders
running residential refurbs to multi-PM firms delivering large extensions.
This is a business tool. Subscriptions are purchased by the builder
business at buildersready.uk; clients (homeowners) are invited by the
builder and use the app at no cost.

FOR YOUR BUSINESS
• One dashboard across every project your business is running
• Outstanding decisions, unapproved variations and unpaid invoices in
  one view
• Team members and clients managed in one place
• A handover document generated automatically for each completed project
• Push notifications when clients respond

FOR YOUR CLIENTS
• A branded portal showing exactly what's happening on their project
• Timeline of every milestone, decision and update
• Photos of progress, organised by project
• Decisions waiting on them — no more chasing texts
• Variations with full breakdown of cost, time impact and reason
• Invoices they can view
• A handover PDF at the end of the project

WHY UK BUILDER BUSINESSES USE IT
• Replace ad-hoc WhatsApp groups with a professional client experience
• Get variations signed off in writing
• Look more established to your clients than the competition
• Spend less time on admin, more time on site
• Protect business margin with proper decision logs

SUBSCRIPTION
Builders Ready is a B2B service. Subscriptions are purchased exclusively
by the builder business on the web at https://buildersready.uk.
The app itself contains no in-app purchases. Clients invited by a
builder business use the app at no cost.

Built in the UK, hosted in the UK/EU. UK GDPR compliant.

Support: info@buildersready.uk
Website: https://buildersready.uk
Privacy: https://buildersready.uk/privacy
Terms: https://buildersready.uk/terms
```

Key changes from the previous description:
- Opens with "B2B client portal for UK builder businesses" — unambiguous
- Replaces "sole traders and small builders" with "registered sole traders running residential refurbs" — clarifies they're a business structure
- Removes pricing references (£29/£69/£149) — these don't belong in an app whose subscription is bought on the web, and they can confuse the IAP reviewer
- Removes the 14-day free trial mention from the app description (still on the website)
- Adds explicit "This is a business tool" and "The app itself contains no in-app purchases" lines for the reviewer

---

## Steps for you in App Store Connect

1. Open the rejected submission in App Store Connect
2. Open the **Resolution Center** message (where the rejection was sent)
3. Paste the **Reply to paste into App Store Connect** section above as your response
4. Go to **App Information → Description** (or the version's description field)
5. Replace the description with the **Updated App Store description** above
6. Save changes
7. Hit **Submit for Review** again — same binary, no upload needed

Apple typically re-reviews text-only changes within 24 hours.

---

## What I am NOT changing

- The mobile binary (no rebuild needed)
- The web marketing site (Apple does not review the marketing site — keep "sole traders" copy on buildersready.uk because UK builders self-identify with that term, and SEO benefits from it)
- The web onboarding flow (already explicitly asks for a business name)

The marketing site and the App Store listing serve different audiences. The App Store listing has to satisfy Apple's reviewer rules; the marketing site has to satisfy UK builders looking for a tool. Both can coexist.

---

## If Apple rejects again

Two fallback options:

1. **Stronger UX change** — add a small line on the mobile login screen: "For builder businesses. Subscriptions managed at buildersready.uk." This requires a binary rebuild but provides a stronger in-app signal.
2. **Escalate to App Review Board** — request a call. We have a strong 3.1.3(c) case and Procore/BuilderTrend precedent. Worth doing if a second reviewer also gets it wrong.

Do NOT add IAP unless we exhaust every other option. IAP would force us to choose between absorbing a 15–30% Apple cut on £29 plans (margin-destroying) or raising prices for App Store users only (confusing and bad UX).
