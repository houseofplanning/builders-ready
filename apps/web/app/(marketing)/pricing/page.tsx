import Link from 'next/link';
import type { Metadata } from 'next';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';

export const metadata: Metadata = {
  title: 'Pricing — Builders Ready',
  description:
    'Builders Ready pricing: Starter £29/mo (up to 10 active projects), Pro £69/mo (up to 50), Unlimited £149/mo. All features on every tier. 14-day free trial. Annual billing saves 2 months.',
  alternates: { canonical: 'https://buildersready.uk/pricing' },
  openGraph: {
    title: 'Pricing — Builders Ready',
    description:
      'Simple pricing for UK builders of every size. £29 / £69 / £149 per month. All features included on every tier. 14-day free trial.',
    url: 'https://buildersready.uk/pricing',
    type: 'website',
  },
};

const TIERS = [
  {
    name: 'Starter',
    price: '29',
    yearly: '290',
    cap: 'up to 10 active projects',
    bestFor:
      'Sole traders and small builders. Bathrooms, kitchens, refurbs — turn every job into a professional client experience.',
  },
  {
    name: 'Pro',
    price: '69',
    yearly: '690',
    cap: 'up to 50 active projects',
    bestFor:
      'Established builders running multiple concurrent projects. Extensions, lofts, full-house refurbs.',
    highlight: true,
  },
  {
    name: 'Unlimited',
    price: '149',
    yearly: '1,490',
    cap: 'unlimited active projects',
    bestFor:
      'Larger firms with a full PM team running many projects in parallel.',
  },
];

const FEATURES = [
  'Branded mobile app (iOS) for your clients',
  'Web admin for owners and project managers',
  'Project timeline with 8 default stages, fully customisable',
  'Photo updates straight from your phone',
  'Decisions inbox with multiple options + photos',
  'Variations with finger-signature audit trail',
  'Live project finance: quote vs final, invoiced vs paid',
  'Invoicing with auto-numbering and paid tracking',
  'PDF reports (engineer reports, surveys, etc.)',
  'Structured weekly notes',
  'Project handover PDF (one-click generation)',
  '1:1 in-app messaging between PM and client',
  'Push notifications for both parties',
  'Multiple project managers per tenant',
  'Cross-project finance dashboard',
  'Outstanding-items panels (decisions, variations, invoices)',
  'UK GDPR compliant, EU data residency',
  'Stripe billing with annual saving and customer portal',
];

export default function PricingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            Pricing
          </p>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Pay for active projects, not features.
          </h1>
          <p className="mx-auto max-w-xl text-base text-ink-muted md:text-lg">
            Whether you do six projects a year as a sole trader or sixty as a
            multi-PM firm, every plan unlocks the entire product. The only
            thing that changes between tiers is how many live projects you
            can run at once. Archive a finished project to free a slot — old
            data stays in your account forever.
          </p>
        </div>
      </section>

      {/* TIERS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-card border bg-white p-7 shadow-card ${
                t.highlight
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-hairline'
              }`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                  Most popular
                </div>
              )}
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
                {t.name}
              </div>
              <div className="mb-1 flex items-baseline">
                <span className="text-4xl font-extrabold">£{t.price}</span>
                <span className="ml-1 text-sm text-ink-muted">/ month</span>
              </div>
              <p className="text-[11px] text-ink-muted">
                or £{t.yearly} / year (save 2 months)
              </p>
              <p className="mt-4 text-sm font-semibold text-ink">{t.cap}</p>
              <p className="mt-3 text-xs text-ink-muted">{t.bestFor}</p>
              <Link
                href="/signup"
                className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-bold ${
                  t.highlight
                    ? 'bg-primary text-white'
                    : 'border border-primary text-primary hover:bg-primary hover:text-white'
                }`}
              >
                Start 14-day free trial
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-ink-muted">
          All prices exclude VAT. 14-day free trial, card required, cancel any
          time inside the app.
        </p>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="mb-3 text-center text-3xl font-extrabold tracking-tight">
            Everything is included on every plan.
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-ink-muted">
            No feature gating. No surprise add-ons. The only number that
            changes between Starter, Pro and Unlimited is how many projects
            you can have live at once.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f}
                className="flex items-start gap-3 rounded-lg border border-hairline bg-white p-4 text-sm"
              >
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5A1 1 0 014.7 8.1l3 3 6.7-6.7a1 1 0 011.3-.1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <FaqJsonLd
          items={[
            {
              q: 'What counts as an "active" project?',
              a: 'Anything in the active or on-hold status. Once you archive a finished project, it no longer counts against your tier limit — but all its data, including the handover PDF, stays in your account forever.',
            },
            {
              q: 'What if I go over my tier?',
              a: 'Builders Ready hard-blocks you from creating a new project once you hit the limit. You can archive a finished project (free) or upgrade your plan (Stripe handles the prorated difference). No surprise fees.',
            },
            {
              q: 'Can I downgrade?',
              a: 'Yes — from your Settings > Billing page, via the Stripe customer portal. If you have more active projects than the lower tier allows, you will need to archive some first.',
            },
            {
              q: 'Annual vs monthly?',
              a: 'Annual is two months cheaper. Most builders start monthly, then switch to annual once they trust the product.',
            },
            {
              q: "What's the free trial really like?",
              a: '14 days of the full Pro tier (50 active projects). Card required to start, but you will not be charged until day 14 — and you can cancel any time before then.',
            },
            {
              q: 'Refunds?',
              a: 'If something stops working and we cannot fix it within 30 days, we will refund your last payment. No quibble.',
            },
            {
              q: 'Do my clients pay anything?',
              a: 'No. Clients install the app and use it for free. You are the one with the subscription.',
            },
            {
              q: 'Is there a setup fee?',
              a: 'No. Sign up, brand your tenant, create your first project — that is the entire onboarding. Takes about 10 minutes.',
            },
          ]}
        />
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight">
          Pricing questions
        </h2>
        <div className="space-y-5">
          <Faq
            q="What counts as an &ldquo;active&rdquo; project?"
            a="Anything in the active or on-hold status. Once you archive a finished project, it no longer counts against your tier limit — but all its data, including the handover PDF, stays in your account forever."
          />
          <Faq
            q="What if I go over my tier?"
            a="Builders Ready hard-blocks you from creating a new project once you hit the limit. You can either archive a finished project (free) or upgrade your plan (Stripe handles the prorated difference). No surprise fees."
          />
          <Faq
            q="Can I downgrade?"
            a="Yes — from your Settings &gt; Billing page, via the Stripe customer portal. If you have more active projects than the lower tier allows, you'll need to archive some first."
          />
          <Faq
            q="Annual vs monthly?"
            a="Annual is two months cheaper. Most builders start monthly, then switch to annual once they trust the product."
          />
          <Faq
            q="What's the free trial really like?"
            a="14 days of the full Pro tier (50 active projects). Card required to start, but you won't be charged until day 14 — and you can cancel any time before then."
          />
          <Faq
            q="Refunds?"
            a="If something stops working and we can't fix it within 30 days, we'll refund your last payment. No quibble."
          />
          <Faq
            q="Do my clients pay anything?"
            a="No. Clients install the app and use it for free. You're the one with the subscription."
          />
          <Faq
            q="Is there a setup fee?"
            a="No. Sign up, brand your tenant, create your first project — that's the entire onboarding. Takes about 10 minutes."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center text-white">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight">
            Try it for 14 days.
          </h2>
          <p className="mx-auto mb-8 max-w-md text-base opacity-90">
            Card required, but you won&rsquo;t be charged until day 14. Cancel
            any time.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-primary hover:opacity-95"
          >
            Start free trial →
          </Link>
        </div>
      </section>
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-card border border-hairline bg-white p-5">
      <summary className="flex cursor-pointer items-center text-sm font-bold">
        <span dangerouslySetInnerHTML={{ __html: q }} />
        <svg
          className="ml-auto h-4 w-4 transition group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 011.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <p
        className="mt-3 text-sm text-ink-muted"
        dangerouslySetInnerHTML={{ __html: a }}
      />
    </details>
  );
}
