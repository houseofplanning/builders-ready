import Link from 'next/link';
import type { Metadata } from 'next';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';
import { PhoneFrame, BrowserFrame } from '@/components/marketing/ui';

const A = '/marketing/rebrand';

export const metadata: Metadata = {
  title: 'Builders Ready: the whole job, one app for UK trades',
  description:
    'One branded app that runs the whole job for UK trades: find work before it is advertised with Planning Radar, quote on site, run the build with signed decisions and variations, hand over with a PDF, and get paid by card or bank.',
  alternates: { canonical: 'https://buildersready.uk' },
  openGraph: {
    title: 'Builders Ready: the whole job, one app',
    description: 'Win the work. Run the job. Get paid. One app for UK trades.',
    url: 'https://buildersready.uk',
    type: 'website',
    siteName: 'Builders Ready',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Builders Ready',
    description: 'Win the work. Run the job. Get paid. One app for UK trades.',
  },
};

const JOBS: [string, string, string, string][] = [
  ['Rear extension', 'Single-storey rear extension', 'Didsbury, Manchester', 'Householder · submitted 2 days ago'],
  ['Loft conversion', 'Loft conversion with dormer', 'Chorlton, Manchester', 'Householder · submitted 3 days ago'],
  ['New dwelling', 'Detached dwelling & garage', 'Headingley, Leeds', 'Full · submitted 4 days ago'],
  ['Basement', 'Basement excavation', 'Clifton, Bristol', 'Full · submitted 5 days ago'],
  ['Two-storey ext.', 'Two-storey side extension', 'Jesmond, Newcastle', 'Householder · submitted 6 days ago'],
  ['Garage conv.', 'Garage to habitable room', 'Pollokshields, Glasgow', 'Householder · submitted 1 week ago'],
  ['Shopfront', 'Shopfront & flats above', 'Cardiff city centre', 'Full · submitted 1 week ago'],
  ['Side extension', 'Side infill extension', 'Edgbaston, Birmingham', 'Householder · submitted 1 week ago'],
  ['New build', 'Pair of semi-detached homes', 'Stockbridge, Edinburgh', 'Full · submitted 1 week ago'],
  ['Renovation', 'Full house refurbishment', 'Sefton Park, Liverpool', 'Householder · submitted 1 week ago'],
];

const VIDEOS: [string, string][] = [
  ['tt-radar', 'Finding work on Planning Radar'],
  ['tt-quote', 'Quote in 70 seconds'],
  ['tt-say', 'Things builders say'],
  ['tt-whole', 'The whole app, one job'],
  ['tt-react', 'Builder reactions'],
  ['tt-rant', 'Why we built it'],
];

const FAQS = [
  {
    q: 'Can I find work with Builders Ready?',
    a: 'Yes. Planning Radar shows you building work being planned near you before it is advertised, and the Marketplace brings homeowner jobs to you. Both are included in your subscription, with no per-lead fees.',
  },
  {
    q: 'How do clients pay, and what does it cost?',
    a: 'Clients can pay milestone invoices by card or bank straight to your own account via Stripe. Builders Ready adds a flat £3 per card payment (free on the Unlimited plan), never a percentage. Bank transfer and cash are free, and it is optional: you can also mark invoices paid yourself.',
  },
  {
    q: 'I only do small jobs. Is this overkill?',
    a: 'No. The £29 Starter tier exists precisely for sole traders and small builders. The same app that runs a £400k extension will run your £18k bathroom refresh, and your client will notice the polish straight away.',
  },
  {
    q: 'What about data security?',
    a: 'UK GDPR compliant, hosted in the UK and EU. We do not sell your data or share it with advertisers, and every database query is row-level-secured so a client can only see their own project.',
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="px-6 sm:px-10">
        <div className="mx-auto grid max-w-[1600px] items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              The whole job, one app
            </p>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-tight text-ink-warm sm:text-6xl lg:text-7xl">
              Win the work.
              <br />
              Run the job.
              <br />
              Get paid.
            </h1>
            <p className="mt-6 max-w-[32em] text-lg text-ink-soft-warm sm:text-xl">
              Builders Ready spots the work near you before it&rsquo;s advertised, quotes it on
              site, runs the project, and gets you paid, without the paperwork or the chasing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-xl bg-primary px-5 py-3 text-base font-bold text-white shadow-card transition hover:bg-primary-deep"
              >
                Start free for 14 days
              </Link>
              <Link href="/features" className="inline-flex items-center gap-2 text-base font-bold text-primary">
                See how it works <span aria-hidden>→</span>
              </Link>
            </div>
            <p className="mt-8 text-sm font-semibold text-ink-muted-warm">
              Built for every UK trade, from sole traders to full-build firms.
            </p>
            <StoreBadges className="mt-7" />
          </div>

          <div className="relative mx-auto h-[400px] w-full max-w-[520px] sm:h-[480px] lg:h-[560px]">
            <PhoneFrame
              src={`${A}/s-projects.png`}
              alt="Your projects in Builders Ready"
              fit="height"
              className="absolute left-[2%] top-[9%] h-[84%] -rotate-6"
            />
            <PhoneFrame
              src={`${A}/s-finance.png`}
              alt="Project finance in Builders Ready"
              fit="height"
              float
              className="absolute right-[2%] top-0 h-[96%]"
            />
          </div>
        </div>
      </section>

      {/* TRUST BAND */}
      <div className="border-y border-hairline-warm bg-paper-alt">
        <div className="mx-auto max-w-[1600px] px-6 py-8 sm:px-10">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink-muted-warm">
            Everything a job needs, in one place
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] font-bold text-ink-soft-warm">
            {[
              'Planning Radar',
              'Quotes & estimates',
              'Projects',
              'Contracts',
              'Payments',
              'Client portal',
              'Marketplace',
            ].map((w, i, arr) => (
              <span key={w} className="flex items-center gap-x-6">
                {w}
                {i < arr.length - 1 && <span className="text-primary">/</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* PLANNING RADAR + CAROUSEL */}
      <section className="pt-20 sm:pt-28">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
                Planning Radar
              </p>
              <h2 className="mt-4 text-4xl font-extrabold leading-[1.07] tracking-tight text-ink-warm sm:text-5xl">
                Jobs being planned across the UK, before they&rsquo;re advertised.
              </h2>
            </div>
            <p className="max-w-[34em] text-lg text-ink-soft-warm">
              From Glasgow to Cardiff, see building work the moment it&rsquo;s in the pipeline, and
              get to the homeowner first. Turn any one into a quote in a tap.
            </p>
          </div>
        </div>
        <div className="br-marquee-wrap br-fade-x mt-12 overflow-hidden">
          <div className="br-marquee flex gap-[18px]">
            {[...JOBS, ...JOBS].map((j, i) => (
              <JobCard key={i} type={j[0]} addr={j[1]} loc={j[2]} meta={j[3]} />
            ))}
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1600px] px-6 sm:px-10">
          <Link href="/planning-radar" className="inline-flex items-center gap-2 text-base font-bold text-primary">
            Explore Planning Radar <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* QUOTES */}
      <FeatureRow
        eyebrow="Quotes & payments"
        title="Quote it. Contract it. Get paid."
        lead="Build a costed quote on site from a template, the client signs it, and it turns into a staged contract. Raise an invoice against each milestone and take payment in a tap."
        checks={[
          'Branded quotes clients sign in seconds',
          'Staged contracts with e-signature & retention',
          'Milestone invoices: card, bank or cash',
        ]}
        media={
          <div className="mx-auto flex w-full max-w-[580px] items-end justify-center gap-2 sm:gap-3">
            <PhoneFrame src={`${A}/s-quote.png`} alt="Build a quote on site" className="w-[31%] -rotate-3" />
            <PhoneFrame src={`${A}/s-contract.png`} alt="Staged contract" className="w-[34%] -translate-y-5" />
            <PhoneFrame src={`${A}/s-newinvoice.png`} alt="Raise an invoice" className="w-[31%] rotate-3" />
          </div>
        }
      />

      {/* CLIENT PORTAL */}
      <FeatureRow
        reverse
        eyebrow="Client portal"
        title="Clients who feel looked after."
        lead="Every update, photo, decision and invoice in one place your client can see. No more “any news?” texts; they can watch the job come together."
        checks={[
          'Progress updates with photos',
          'Decisions & variations signed off in writing',
          'One tidy handover pack at the end',
        ]}
        media={<BrowserFrame src={`${A}/s-web-portal.png`} alt="The client web portal" />}
      />

      {/* HOMEOWNERS */}
      <FeatureRow
        eyebrow="For homeowners"
        title="Need work done? Post it free."
        lead="Post your job and trusted local trades come to you. Compare quotes, pick who you like, then follow the whole project in one place: updates, photos and payments."
        checks={[
          'Free to post, no obligation',
          'Quotes from verified local trades',
          'Track updates, photos & payments as it happens',
        ]}
        cta={{ href: '/signup/customer', label: 'Post a job for free' }}
        media={<PhoneFrame src={`${A}/s-postjob.png`} alt="Posting a job on Builders Ready" className="mx-auto w-[min(290px,78%)]" />}
      />

      {/* VIDEOS */}
      <section className="bg-paper-alt py-20 sm:py-28">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-6 px-6 sm:px-10">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">See it in action</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm sm:text-5xl">Straight from the site.</h2>
          </div>
          <a
            href="https://www.tiktok.com/@BuildersReadyUK"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-base font-bold text-primary"
          >
            Follow @BuildersReadyUK on TikTok <span aria-hidden>→</span>
          </a>
        </div>
        <div className="br-marquee-wrap br-fade-x mt-9 overflow-hidden">
          <div className="br-marquee-slow flex gap-[18px]">
            {[...VIDEOS, ...VIDEOS].map((v, i) => (
              <VideoCard key={i} slug={v[0]} caption={v[1]} />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="max-w-[42em]">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Pricing</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm sm:text-5xl">
              Simple pricing. Every feature on every plan.
            </h2>
            <p className="mt-4 text-lg text-ink-soft-warm">
              The only difference is how many projects you run at once. 14-day free trial.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[1080px] gap-5 md:grid-cols-3">
            <PricingTier name="Starter" price="£29" cap="Up to 5 active projects" bestFor="Sole traders and small builders: bathrooms, kitchens, refurbs." />
            <PricingTier name="Pro" price="£69" cap="Up to 15 active projects" bestFor="Established builders running multiple concurrent projects." highlight />
            <PricingTier name="Unlimited" price="£149" cap="Unlimited active projects" bestFor="Larger firms with a full PM team, with no card payment fees." />
          </div>
          <p className="mt-8 text-sm font-semibold text-ink-muted-warm">
            All plans billed monthly. Annual billing saves you two months. Homeowners are always
            free.{' '}
            <Link href="/pricing" className="text-primary underline underline-offset-2">
              See the full comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-hairline-warm bg-paper-alt py-20 sm:py-28">
        <div className="mx-auto max-w-[820px] px-6 sm:px-10">
          <FaqJsonLd items={FAQS} />
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">FAQ</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm">Questions, answered.</h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-24">
          <h2 className="max-w-[16em] text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Run every job in one place.
          </h2>
          <p className="mt-4 max-w-[30em] text-lg text-white/80">
            Start free for 14 days. Bring your next quote across and see the difference.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-base font-bold text-primary transition hover:bg-paper">
              Start free for 14 days
            </Link>
            <Link href="/pricing" className="inline-flex items-center rounded-xl border-[1.5px] border-white/40 px-5 py-3 text-base font-bold text-white transition hover:border-white">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- helpers ---------- */

function FeatureRow({
  eyebrow,
  title,
  lead,
  checks,
  media,
  reverse,
  cta,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  checks: string[];
  media: React.ReactNode;
  reverse?: boolean;
  cta?: { href: string; label: string };
}) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20">
        <div className={reverse ? 'lg:order-2' : ''}>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-[1.07] tracking-tight text-ink-warm sm:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[34em] text-lg text-ink-soft-warm">{lead}</p>
          <ul className="mt-7 space-y-3">
            {checks.map((c) => (
              <li key={c} className="flex items-start gap-3 text-base text-ink-soft-warm">
                <span className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-black text-primary">
                  ✓
                </span>
                {c}
              </li>
            ))}
          </ul>
          {cta ? (
            <Link href={cta.href} className="mt-8 inline-flex items-center rounded-xl bg-primary px-5 py-3 text-base font-bold text-white shadow-card transition hover:bg-primary-deep">
              {cta.label}
            </Link>
          ) : (
            <Link href="/features" className="mt-8 inline-flex items-center gap-2 text-base font-bold text-primary">
              Learn more <span aria-hidden>→</span>
            </Link>
          )}
        </div>
        <div className={`flex justify-center ${reverse ? 'lg:order-1' : ''}`}>{media}</div>
      </div>
    </section>
  );
}

function JobCard({ type, addr, loc, meta }: { type: string; addr: string; loc: string; meta: string }) {
  return (
    <div className="w-[320px] flex-shrink-0 rounded-2xl border border-hairline-warm bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="rounded-md bg-primary/[0.07] px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
          {type}
        </span>
        <span className="text-[11px] font-extrabold tracking-wider text-accent-deep">NEW</span>
      </div>
      <div className="text-base font-extrabold leading-snug tracking-tight text-ink-warm">{addr}</div>
      <div className="mt-1 text-sm font-semibold text-ink-muted-warm">{loc}</div>
      <div className="mt-3.5 border-t border-hairline-warm pt-3 text-[12.5px] text-ink-muted-warm">{meta}</div>
    </div>
  );
}

function VideoCard({ slug, caption }: { slug: string; caption: string }) {
  return (
    <div className="relative aspect-[9/16] w-[232px] flex-shrink-0 overflow-hidden rounded-2xl border border-hairline-warm bg-black shadow-xl">
      <video
        src={`${A}/${slug}.mp4`}
        poster={`${A}/po-${slug}.png`}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3.5 text-sm font-bold text-white">
        {caption}
      </div>
    </div>
  );
}

function StoreBadges({ className = '' }: { className?: string }) {
  const badge =
    'inline-flex items-center gap-2.5 rounded-xl bg-ink-warm px-4 py-2.5 text-white transition hover:opacity-90';
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
          <span className="block text-[9px] font-medium uppercase tracking-wide">Download on the</span>
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
          <span className="block text-[9px] font-medium uppercase tracking-wide">Get it on</span>
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
      className={`relative rounded-2xl border bg-white p-8 ${
        highlight ? 'border-primary shadow-raised' : 'border-hairline-warm'
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
          Most popular
        </div>
      )}
      <div className="text-lg font-extrabold text-ink-warm">{name}</div>
      <div className="mt-2 flex items-baseline">
        <span className="text-4xl font-extrabold tracking-tight text-ink-warm">{price}</span>
        <span className="ml-1 text-base font-semibold text-ink-muted-warm">/mo</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-ink-muted-warm">{cap}</p>
      <p className="mt-5 text-sm text-ink-soft-warm">{bestFor}</p>
      <Link
        href="/signup"
        className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-bold transition ${
          highlight
            ? 'bg-primary text-white hover:bg-primary-deep'
            : 'border-[1.5px] border-hairline-warm text-primary hover:border-primary'
        }`}
      >
        Start free
      </Link>
    </div>
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
