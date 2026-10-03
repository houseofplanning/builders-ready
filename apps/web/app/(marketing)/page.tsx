import Link from 'next/link';
import type { Metadata } from 'next';
import { JourneyStrip } from '@/components/marketing/journey-strip';
import { TradesBand } from '@/components/marketing/trades-band';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';

export const metadata: Metadata = {
  title: 'Builders Ready — the client portal for UK builders',
  description:
    'One branded app that runs the whole job for UK builders — quote on site, manage the build with signed decisions and variations, hand over with a PDF, and get paid by card or bank straight to your account.',
  alternates: { canonical: 'https://buildersready.uk' },
  openGraph: {
    title: 'Builders Ready — the client portal for UK builders',
    description:
      'Every build, from the first quote to the final payment — the whole job in one branded app.',
    url: 'https://buildersready.uk',
    type: 'website',
    siteName: 'Builders Ready',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Builders Ready',
    description:
      'Every build, from the first quote to the final payment — one app for UK builders.',
  },
};

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="bg-gradient-to-b from-canvas to-white">
        <div className="mx-auto max-w-5xl px-6 pt-16 text-center md:pt-24">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            For every UK trade · decorator to multi-PM firm
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
            Every build, from the first quote to{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              the final payment.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-muted md:text-lg">
            The full 360 for any trade — one branded app that runs the whole job,
            from the quote on the client&rsquo;s kitchen worktop to the money
            landing in your bank. Two-room paint job or £400k extension, same app.
            No WhatsApp chaos, no chasing invoices.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-card hover:opacity-95"
            >
              Start 14-day free trial
            </Link>
            <Link
              href="/features"
              className="rounded-lg border border-hairline bg-white px-6 py-3 text-sm font-bold text-ink hover:bg-canvas"
            >
              See how it works →
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            No setup fee · Cancel anytime · UK GDPR compliant
          </p>
          <StoreBadges className="mt-6 justify-center" />
        </div>

        {/* Left-to-right journey visual */}
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-12 md:pb-24">
          <JourneyStrip />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-hairline bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-6 py-8 text-center text-[11px] font-semibold uppercase tracking-widest text-ink-muted md:grid-cols-4">
          <span>Built in the UK</span>
          <span>UK GDPR compliant</span>
          <span>Stripe payments</span>
          <span>iOS + Android + web</span>
        </div>
      </section>

      {/* EVERY TRADE */}
      <TradesBand />

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
            Everything in one place
          </p>
          <h2 className="mx-auto mb-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            The whole job, one app.
          </h2>
          <p className="mx-auto max-w-2xl text-base text-ink-muted">
            Replace the WhatsApp threads, email chains and scattered
            spreadsheets. Every feature is included on every plan.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <FeatureCard
            badge="New"
            title="On-site quotes"
            body="Build the quote on your phone from cost and margin, send a branded PDF or link the client accepts and signs, then turn a won quote into a project in one tap."
          />
          <FeatureCard
            title="Live build updates"
            body="A timeline that fits the job — pick your trade and it seeds the right stages, from a single step to a full build. Post site photos and updates straight from the van; your client sees them within seconds."
          />
          <FeatureCard
            title="Decisions & variations"
            body="Send options with photos and prices; the client taps to choose. Propose variations they sign with their finger. Every change audit-trailed."
          />
          <FeatureCard
            badge="New"
            title="Contracts & staged payments"
            body="A signable contract with your terms and a clear payment schedule — deposit, stages, completion — with a retention held back until snagging."
          />
          <FeatureCard
            badge="New"
            title="Get paid in the app"
            body="Clients pay milestone invoices by card or bank, straight to your account. Money lands the day a milestone is signed off — no chasing transfers."
          />
          <FeatureCard
            title="Costs, margin & handover"
            body="Log materials, labour and subbie invoices for a live margin only your team sees. Finish with a one-tap handover PDF of the whole job."
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="text-sm font-semibold text-primary hover:underline"
          >
            See every feature in detail →
          </Link>
        </div>
      </section>

      {/* PRICING SNAPSHOT */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
              Pricing
            </p>
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight">
              Priced by how many jobs you&rsquo;re running.
            </h2>
            <p className="mb-12 text-sm text-ink-muted">
              Every feature on every tier. 14-day free trial, no setup fee.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <PricingTier
              name="Starter"
              price="£29"
              cap="Up to 5 active projects"
              bestFor="Sole traders and small builders — bathrooms, kitchens, refurbs."
            />
            <PricingTier
              name="Pro"
              price="£69"
              cap="Up to 15 active projects"
              bestFor="Established builders running multiple concurrent projects."
              highlight
            />
            <PricingTier
              name="Unlimited"
              price="£149"
              cap="Unlimited active projects"
              bestFor="Larger residential firms with a full PM team."
            />
          </div>
          <div className="mt-10 text-center">
            <p className="text-xs text-ink-muted">
              All prices exclude VAT. Annual billing saves you two months.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              See the full comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <FaqJsonLd
          items={[
            {
              q: 'Can I build and send quotes from Builders Ready?',
              a: 'Yes. Build a full quote on site from your own costs and margin, save your regular rates to reuse, and send it as a branded PDF or a link the client accepts and signs on their phone. Win it, and it becomes a project in one tap.',
            },
            {
              q: 'How do clients pay, and what does it cost?',
              a: 'Clients can pay milestone invoices by card or bank straight to your own account via Stripe. Builders Ready adds a flat £3 per payment (free on the Unlimited plan) — never a percentage, so a big milestone never costs you more. It is entirely optional: you can also just use manual invoices and mark them paid yourself.',
            },
            {
              q: 'I only do small jobs — is this overkill?',
              a: 'No. The £29 Starter tier exists precisely for sole traders and small builders running a handful of projects a year. The same app that runs a £400k extension will run your £18k bathroom refresh — and your client will notice the polish straight away.',
            },
            {
              q: 'What about data security?',
              a: 'UK GDPR compliant, hosted in the UK and EU. We do not sell your data or share it with advertisers. Every database query is row-level-secured: a client can only see their own project.',
            },
          ]}
        />
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight">
          Common questions
        </h2>
        <div className="space-y-6">
          <Faq
            q="Can I build and send quotes from Builders Ready?"
            a="Yes. Build a full quote on site from your own costs and margin, save your regular rates to reuse, and send it as a branded PDF or a link the client accepts and signs on their phone. Win it, and it becomes a project in one tap."
          />
          <Faq
            q="How do clients pay, and what does it cost?"
            a="Clients can pay milestone invoices by card or bank straight to your own account via Stripe. Builders Ready adds a flat £3 per payment (free on Unlimited) — never a percentage, so a big milestone never costs you more. It's optional too: you can stick to manual invoices and mark them paid yourself."
          />
          <Faq
            q="I only do small jobs — is this overkill?"
            a="No. The £29 Starter tier exists precisely for sole traders and small builders running a handful of projects a year. The same app that runs a £400k extension will run your £18k bathroom refresh — and your client will notice the polish straight away."
          />
          <Faq
            q="What about data security?"
            a="UK GDPR compliant, hosted in the UK and EU. We don't sell your data, and we don't share it with advertisers. Every database query is row-level-secured: a client can only see their own project, and only data for their builder."
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center text-white">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Look more professional than the builder quoting against you.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base opacity-90">
            From £29/mo. 14-day free trial. Works whether you do six projects a
            year or sixty.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-primary hover:opacity-95"
          >
            Start your free trial →
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  body,
  badge,
}: {
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <div className="rounded-card border border-hairline bg-white p-7 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-extrabold">{title}</h3>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted">{body}</p>
    </div>
  );
}

function StoreBadges({ className = '' }: { className?: string }) {
  const badge =
    'inline-flex items-center gap-2.5 rounded-xl bg-ink px-4 py-2.5 text-white transition hover:opacity-90';
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href="https://apps.apple.com/gb/app/builders-ready/id6771347066"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download Builders Ready on the App Store"
        className={badge}
      >
        <svg viewBox="0 0 384 512" className="h-6 w-6 fill-current" aria-hidden="true">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[9px] font-medium uppercase tracking-wide">
            Download on the
          </span>
          <span className="-mt-0.5 block text-base font-semibold">App Store</span>
        </span>
      </a>
      <a
        href="https://play.google.com/store/apps/details?id=uk.buildersready.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get Builders Ready on Google Play"
        className={badge}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
          <path d="M4 3.5v17a1 1 0 0 0 1.5.87l14.5-8.5a1 1 0 0 0 0-1.74L5.5 2.63A1 1 0 0 0 4 3.5z" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[9px] font-medium uppercase tracking-wide">
            Get it on
          </span>
          <span className="-mt-0.5 block text-base font-semibold">Google Play</span>
        </span>
      </a>
    </div>
  );
}

function PricingTier({
  name,
  price,
  cap,
  bestFor,
  highlight,
}: {
  name: string;
  price: string;
  cap: string;
  bestFor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-card border bg-white p-7 shadow-card ${
        highlight ? 'border-primary ring-2 ring-primary/30' : 'border-hairline'
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
          Most popular
        </div>
      )}
      <div className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-muted">
        {name}
      </div>
      <div className="mb-2 flex items-baseline">
        <span className="text-3xl font-extrabold text-ink">{price}</span>
        <span className="ml-1 text-sm text-ink-muted">/ month</span>
      </div>
      <p className="mb-5 text-sm font-semibold text-ink">{cap}</p>
      <p className="text-xs text-ink-muted">{bestFor}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-card border border-hairline bg-white p-5">
      <summary className="flex cursor-pointer items-center text-sm font-bold">
        <span>{q}</span>
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
      <p className="mt-3 text-sm text-ink-muted">{a}</p>
    </details>
  );
}
