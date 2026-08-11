import Link from 'next/link';
import type { Metadata } from 'next';
import {
  MockupProjectGrid,
  MockupDecision,
  MockupVariation,
  MockupDashboard,
} from '@/components/marketing/mockups';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';

export const metadata: Metadata = {
  title: 'Builders Ready — the client portal for UK builders',
  description:
    'From £20k bathrooms to £400k extensions — Builders Ready gives every UK builder a branded mobile and web client portal. Timeline, decisions, variations with signature, finance summary and project handover PDF — in one place.',
  alternates: { canonical: 'https://buildersready.uk' },
  openGraph: {
    title: 'Builders Ready — the client portal for UK builders',
    description:
      'The client portal UK builders use to look professional, protect margin, and end disputes about who agreed to what.',
    url: 'https://buildersready.uk',
    type: 'website',
    siteName: 'Builders Ready',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Builders Ready',
    description:
      'The client portal UK builders use to look professional.',
  },
};

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="bg-gradient-to-b from-canvas to-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
              For UK builders · solo trade to multi-PM firm
            </p>
            <h1 className="mb-5 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
              Give your clients a portal they&rsquo;ll{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                actually open.
              </span>
            </h1>
            <p className="max-w-xl text-base text-ink-muted md:text-lg">
              Replace WhatsApp chaos, email chains and scattered spreadsheets
              with one branded app. Live progress, signed decisions, audit-trailed
              variations, real-time finance — for you and your client.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
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
            <StoreBadges className="mt-6" />
            <p className="mt-2 text-[11px] text-ink-muted">
              Now on iPhone and Android.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl" />
            <MockupProjectGrid className="mx-auto h-auto w-full max-w-[260px] drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-hairline bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-6 py-8 text-center text-[11px] font-semibold uppercase tracking-widest text-ink-muted md:grid-cols-4">
          <span>Built in the UK</span>
          <span>UK GDPR compliant</span>
          <span>Stripe billing</span>
          <span>iOS + Android + web</span>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-accent-deep">
              The problem
            </p>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Big job or small — every project deserves better than a 200-message group chat.
            </h2>
            <p className="text-base text-ink-muted">
              Whether you&rsquo;re refreshing a £15k bathroom or running a
              £400k extension, the failure modes are the same. Photo updates
              buried in WhatsApp. Decisions agreed verbally and forgotten.
              Variations argued about three months later. Invoices chased by
              email. A handover folder that doesn&rsquo;t exist.
            </p>
            <p className="mt-4 text-base text-ink-muted">
              The amount of money on the line scales the consequences. The
              admin problem is identical. Clients who feel kept in the loop
              recommend you. Clients who don&rsquo;t, query the invoice.
            </p>
          </div>
          <div className="rounded-card border border-hairline bg-canvas p-7">
            <ul className="space-y-4 text-sm">
              <BulletProblem text="“What's happening with my project?” — three or four times a week." />
              <BulletProblem text="“We never agreed to that variation.” — three months too late." />
              <BulletProblem text="“Why is this invoice over the quote?” — at handover." />
              <BulletProblem text="“Where's the certificate for the boiler?” — six months after handover." />
              <BulletProblem text="Looking less organised than the builder quoting against you." />
            </ul>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
              The solution
            </p>
            <h2 className="mx-auto mb-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              One app. Your branding. Everything signed off.
            </h2>
            <p className="mx-auto max-w-2xl text-base text-ink-muted">
              Builders Ready replaces the patchwork. Your clients install one
              branded app, watch their project progress in real time, and sign
              off decisions and variations with their finger. You ship a full
              project record PDF at handover — quote vs final, every change,
              every approval.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <FeatureCard
              title="Decisions inbox"
              body="Tile choice? Pendant lights? Send your client a few options with photos. They tap. Signed and logged."
            />
            <FeatureCard
              title="Variations with signature"
              body="Propose with title, description, cost delta and time impact. Client signs on their phone. Disputes end."
            />
            <FeatureCard
              title="Project handover PDF"
              body="One document at the end of the project — timeline, every update, every decision, every variation, every invoice."
            />
            <FeatureCard
              title="Live project finance"
              body="Quote vs final. Variations to date. Invoiced vs paid. At a glance, on your phone or your client's."
            />
            <FeatureCard
              title="Timeline & photo updates"
              body="Post site updates with photos straight from the van. Clients see progress as it happens."
            />
            <FeatureCard
              title="Push notifications"
              body="Real-time alerts for new decisions, signed variations, and updates. For you and your client."
            />
          </div>
        </div>
      </section>

      {/* MOBILE SHOWCASE */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
              On the phone
            </p>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight">
              Mobile-first because that&rsquo;s where decisions happen.
            </h2>
            <p className="text-base text-ink-muted">
              Your client&rsquo;s real life happens on their phone. Post an
              update from the site. Raise a decision while standing next to
              the tile sample. Sign off a variation between meetings. The
              entire workflow fits into 30 seconds of phone time.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              <BulletGood text="Push notifications the second anything changes" />
              <BulletGood text="Open decisions inbox shows everything awaiting client action" />
              <BulletGood text="Tap-to-accept and finger-sign with full audit trail" />
              <BulletGood text="Live finance summary scrolls right under the timeline" />
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MockupDecision className="h-auto w-full drop-shadow-xl" />
            <MockupVariation className="h-auto w-full drop-shadow-xl" />
          </div>
        </div>
      </section>

      {/* WEB SHOWCASE */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="order-2 md:order-1">
              <MockupDashboard className="h-auto w-full rounded-2xl shadow-2xl ring-1 ring-hairline" />
            </div>
            <div className="order-1 md:order-2">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
                On the desktop
              </p>
              <h2 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight">
                Web admin for setup, oversight and answering the phone.
              </h2>
              <p className="text-base text-ink-muted">
                Spin up new projects in 60 seconds. See cross-project finance
                across every active job. When a client phones, open the web
                dashboard and answer with the same data they&rsquo;re looking
                at — no scrolling through threads.
              </p>
              <ul className="mt-7 space-y-3 text-sm">
                <BulletGood text="Cross-project KPI tiles: contracted, invoiced, paid, outstanding" />
                <BulletGood text="Open-decisions / unpaid-invoices / unsigned-variations panels" />
                <BulletGood text="Per-project: raise decisions, propose variations, create invoices, upload PDFs" />
                <BulletGood text="One-click project handover PDF generation" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SNAPSHOT */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight">
            Simple. Scales with how many jobs you&rsquo;re running.
          </h2>
          <p className="mb-12 text-sm text-ink-muted">
            All features are included at every tier. 14-day free trial, no
            setup fee.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <PricingTier
            name="Starter"
            price="£29"
            cap="Up to 10 active projects"
            bestFor="Sole traders and small builders. Bathrooms, kitchens, refurbs — keep every job on one app."
          />
          <PricingTier
            name="Pro"
            price="£69"
            cap="Up to 50 active projects"
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
      </section>

      {/* FAQ */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <FaqJsonLd
            items={[
              {
                q: 'I only do small jobs — is this overkill?',
                a: 'No. The £29 Starter tier exists precisely for sole traders and small builders running a handful of projects a year. The same app that runs a £400k extension will run your £18k bathroom refresh.',
              },
              {
                q: 'Do my clients have to learn another app?',
                a: 'They install one app — Builders Ready — branded with your logo and colours. Set up takes 90 seconds. They get push notifications for decisions and updates.',
              },
              {
                q: 'Can my project managers use it too?',
                a: 'Yes. Owners and project managers can post updates, raise decisions, propose variations, mark invoices paid, and generate the handover PDF — from web or mobile.',
              },
              {
                q: 'What about data security?',
                a: 'UK GDPR compliant, hosted in the UK and EU. We do not sell your data or share it with advertisers. Every database query is row-level-secured: a client can only see their own project.',
              },
              {
                q: 'What if I hit my tier limit?',
                a: 'You can archive a finished project to free a slot, or upgrade. Either way, no data is lost.',
              },
              {
                q: 'Is there a mobile app for iPhone and Android?',
                a: 'Yes — Builders Ready is live on both the Apple App Store and Google Play, so your clients can use it whatever phone they are on. There is also a responsive web app for any device with a browser.',
              },
            ]}
          />
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight">
            Common questions
          </h2>
          <div className="space-y-6">
            <Faq
              q="I only do small jobs — is this overkill?"
              a="No. The £29 Starter tier exists precisely for sole traders and small builders running a handful of projects a year. The same app that runs a £400k extension will run your £18k bathroom refresh — and your client will notice the polish straight away."
            />
            <Faq
              q="Do my clients have to learn another app?"
              a="They install one app — Builders Ready — branded with your logo and colours. Set up takes 90 seconds. They get push notifications for decisions and updates, which is the only thing they need to know."
            />
            <Faq
              q="Can my project managers use it too?"
              a="Yes. Owners and project managers can post updates, raise decisions, propose variations, mark invoices paid, and generate the handover PDF — from web or mobile."
            />
            <Faq
              q="What about data security?"
              a="UK GDPR compliant, hosted in the UK and EU. We don't sell your data, and we don't share it with advertisers. Every database query is row-level-secured: a client can only see their own project, and only data for their builder."
            />
            <Faq
              q="What if I hit my tier limit?"
              a="You can archive a finished project to free a slot — projects you've handed over don't need to count against your active limit. Or upgrade. Either way, no data is lost."
            />
            <Faq
              q="Is there a mobile app for iPhone and Android?"
              a="Yes — Builders Ready is live on both the Apple App Store and Google Play, so your clients can use it whatever phone they're on. There's also a responsive web app for any device with a browser."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center text-white">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Look more professional than the builder quoting against you.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base opacity-90">
            From £29/mo. 14-day free trial. Works whether you do six projects
            a year or sixty.
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

function BulletProblem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-error" />
      <span className="text-ink">{text}</span>
    </li>
  );
}

function BulletGood({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
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
      <span className="text-ink">{text}</span>
    </li>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-7 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <h3 className="mb-2 text-base font-extrabold">{title}</h3>
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
