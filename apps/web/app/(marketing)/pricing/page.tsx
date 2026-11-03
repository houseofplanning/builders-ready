import Link from 'next/link';
import type { Metadata } from 'next';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';
import { Rail, Eyebrow, FinalCta } from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'Pricing | Builders Ready',
  description:
    'Builders Ready pricing: Starter £29/mo (up to 5 active projects), Pro £69/mo (up to 15), Unlimited £149/mo. Every feature on every tier: Planning Radar, quoting, contracts, staged payments and get-paid. 14-day free trial. Annual billing saves 2 months.',
  alternates: { canonical: 'https://buildersready.uk/pricing' },
  openGraph: {
    title: 'Pricing | Builders Ready',
    description:
      'Simple pricing for UK builders of every size. £29 / £69 / £149 per month. Every feature on every tier. 14-day free trial.',
    url: 'https://buildersready.uk/pricing',
    type: 'website',
  },
};

const TIERS = [
  {
    name: 'Starter',
    price: '29',
    yearly: '290',
    cap: 'Up to 5 active projects',
    bestFor:
      'Sole traders and small trades: decorators, tilers, bathroom fitters, small builders. Turn every job into a professional client experience.',
  },
  {
    name: 'Pro',
    price: '69',
    yearly: '690',
    cap: 'Up to 15 active projects',
    bestFor:
      'Established builders and small firms running several jobs at once: extensions, lofts, full-house refurbs.',
    highlight: true,
  },
  {
    name: 'Unlimited',
    price: '149',
    yearly: '1,490',
    cap: 'Unlimited active projects',
    bestFor:
      'Larger firms with a full PM team running many projects in parallel, with no card payment fees.',
  },
];

const FEATURES = [
  'Find work with Planning Radar, no per-lead fees',
  'Branded mobile app (iOS + Android) for your clients',
  'Web admin for owners and project managers',
  'On-site quotes & estimates: cost + margin, client e-signs',
  'Contracts & staged payments with retention',
  'Get paid by card or bank, straight to your account',
  'Cost & margin tracking (team-only)',
  'Project-type timeline templates, fully editable',
  'Photo updates straight from your phone',
  'Decisions inbox with options and photos',
  'Variations with finger-signature audit trail',
  'Live project finance: quote vs final, invoiced vs paid',
  'Invoicing with auto-numbering and paid tracking',
  'PDF reports (engineer reports, surveys, etc.)',
  'One-click project handover PDF',
  '1:1 in-app messaging between PM and client',
  'Push notifications for both parties',
  'Multiple project managers per account',
  'Cross-project finance dashboard',
  'UK GDPR compliant, EU data residency',
];

const FAQS = [
  {
    q: 'What counts as an "active" project?',
    a: 'Anything in the active or on-hold status. Once you archive a finished project it no longer counts against your tier limit, but all its data, including the handover PDF, stays in your account forever.',
  },
  {
    q: 'What if I go over my tier?',
    a: 'Builders Ready stops you creating a new project once you hit the limit. Archive a finished project (free) or upgrade your plan (Stripe handles the prorated difference). No surprise fees.',
  },
  {
    q: 'Can I downgrade?',
    a: 'Yes, from Settings › Billing, via the Stripe customer portal. If you have more active projects than the lower tier allows, you will need to archive some first.',
  },
  {
    q: 'Annual vs monthly?',
    a: 'Annual is two months cheaper. Most builders start monthly, then switch to annual once they trust the product.',
  },
  {
    q: "What's the free trial really like?",
    a: '14 days of the full Pro tier (15 active projects), with every feature unlocked. Cancel any time before it ends.',
  },
  {
    q: 'Do my clients pay anything?',
    a: 'No. Clients install the app and use it for free, and homeowners posting jobs are always free. You are the one with the subscription.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'No. Sign up, brand your account and create your first project. That is the whole onboarding, about ten minutes.',
  },
];

export default function PricingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="pt-10 sm:pt-14">
        <Rail>
          <div className="max-w-[42em]">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-tight text-ink-warm sm:text-6xl">
              Pay for active projects, not features.
            </h1>
            <p className="mt-6 text-lg text-ink-soft-warm sm:text-xl">
              Six projects a year as a sole trader or sixty as a multi-PM firm: every plan unlocks
              the entire product. The only thing that changes between tiers is how many live
              projects you run at once. Archive a finished job to free a slot; the data stays
              forever.
            </p>
          </div>
        </Rail>
      </section>

      {/* TIERS */}
      <section className="pt-14 sm:pt-16">
        <Rail>
          <div className="mx-auto grid max-w-[1080px] gap-5 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`relative rounded-2xl border bg-white p-8 ${
                  t.highlight ? 'border-primary shadow-raised' : 'border-hairline-warm'
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                    Most popular
                  </div>
                )}
                <div className="text-lg font-extrabold text-ink-warm">{t.name}</div>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight text-ink-warm">£{t.price}</span>
                  <span className="ml-1 text-base font-semibold text-ink-muted-warm">/mo</span>
                </div>
                <p className="mt-1 text-sm text-ink-muted-warm">
                  or £{t.yearly}/year, saving two months
                </p>
                <p className="mt-4 text-sm font-semibold text-ink-warm">{t.cap}</p>
                <p className="mt-3 text-sm text-ink-soft-warm">{t.bestFor}</p>
                <Link
                  href="/signup"
                  className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-bold transition ${
                    t.highlight
                      ? 'bg-primary text-white hover:bg-primary-deep'
                      : 'border-[1.5px] border-hairline-warm text-primary hover:border-primary'
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-semibold text-ink-muted-warm">
            All prices exclude VAT. 14-day free trial, cancel any time inside the app. Homeowners are
            always free.
          </p>
        </Rail>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="mt-20 border-y border-hairline-warm bg-paper-alt py-20 sm:mt-28 sm:py-28">
        <Rail className="max-w-[920px]">
          <div className="text-center">
            <Eyebrow>Included on every plan</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm sm:text-5xl">
              No feature gating. No add-ons.
            </h2>
            <p className="mx-auto mt-4 max-w-[36em] text-lg text-ink-soft-warm">
              The only number that changes between Starter, Pro and Unlimited is how many projects
              you can run at once.
            </p>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f}
                className="flex items-start gap-3 rounded-xl border border-hairline-warm bg-white p-4 text-[15px] text-ink-soft-warm"
              >
                <span className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-black text-primary">
                  ✓
                </span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </Rail>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28">
        <Rail className="max-w-[820px]">
          <FaqJsonLd items={FAQS} />
          <Eyebrow>Pricing questions</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm">
            The money bits, answered.
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </Rail>
      </section>

      <FinalCta
        title="Try it for 14 days."
        lead="Every feature unlocked, cancel any time. Bring your next quote across and see the difference."
        primary={{ href: '/signup', label: 'Start free trial' }}
        secondary={{ href: '/features', label: 'See all features' }}
      />
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-hairline-warm bg-white p-5">
      <summary className="flex cursor-pointer items-center text-base font-bold text-ink-warm">
        <span>{q}</span>
        <svg className="ml-auto h-4 w-4 flex-shrink-0 transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 011.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft-warm">{a}</p>
    </details>
  );
}
