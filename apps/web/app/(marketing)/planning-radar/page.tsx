import type { Metadata } from 'next';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';
import {
  REBRAND as A,
  Rail,
  Eyebrow,
  PrimaryButton,
  GhostLink,
  FeatureRow,
  FinalCta,
  PhoneFrame,
} from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'Planning Radar: find building work before it is advertised | Builders Ready',
  description:
    'Planning Radar shows UK builders the work being planned near them the moment it hits the public record (extensions, lofts, basements, new builds) sorted by distance. Turn any listing into a quote in a tap, draft a branded letter to the occupier, and save your patch for a daily alert. Included in every plan, no per-lead fees.',
  alternates: { canonical: 'https://buildersready.uk/planning-radar' },
  openGraph: {
    title: 'Planning Radar: find work before it is advertised',
    description:
      'See building work being planned near you before anyone else, sorted by distance. Turn it into a quote in a tap.',
    url: 'https://buildersready.uk/planning-radar',
    type: 'website',
    siteName: 'Builders Ready',
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

const FAQS = [
  {
    q: 'Where does the data come from?',
    a: 'Planning Radar reads the public planning record from councils across the UK. As soon as an application is logged, it can appear on your Radar, long before the job is advertised anywhere a builder would normally see it.',
  },
  {
    q: 'How do I get in front of the homeowner?',
    a: 'Each listing has the site address. Draft a branded letter to the occupier in the app and it is emailed to you to print and post, or just knock and introduce yourself. You are reaching them before any other trade has seen the job.',
  },
  {
    q: 'Does it cost extra per lead?',
    a: 'No. Planning Radar is included in every Builders Ready plan, with no per-lead fees. It is part of your subscription alongside quotes, projects, payments and the Marketplace.',
  },
];

export default function PlanningRadarPage() {
  return (
    <main>
      {/* HERO — single phone + live carousel, distinct from the homepage */}
      <section className="pt-10 sm:pt-14">
        <Rail>
          <div className="grid items-center gap-12 pb-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div>
              <Eyebrow>Planning Radar</Eyebrow>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-tight text-ink-warm sm:text-6xl">
                Your next job is already in the council&rsquo;s files.
              </h1>
              <p className="mt-6 max-w-[32em] text-lg text-ink-soft-warm sm:text-xl">
                Planning Radar shows you building work being planned near you the moment it hits the
                public record, then gets you to the homeowner before any other trade knows it
                exists.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <PrimaryButton href="/signup">Start free for 14 days</PrimaryButton>
                <GhostLink href="/pricing">See pricing</GhostLink>
              </div>
              <p className="mt-8 text-sm font-semibold text-ink-muted-warm">
                UK-wide · sorted by distance · included on every plan, no per-lead fees.
              </p>
            </div>

            <div className="flex justify-center">
              <PhoneFrame
                src={`${A}/s-radar.png`}
                alt="Planning Radar, building work near you sorted by distance"
                float
                className="w-[min(290px,78%)]"
              />
            </div>
          </div>
        </Rail>
      </section>

      {/* LIVE CAROUSEL */}
      <section className="pt-10 sm:pt-14">
        <Rail>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink-muted-warm">
            Being planned right now, across the UK
          </p>
        </Rail>
        <div className="br-marquee-wrap br-fade-x mt-6 overflow-hidden">
          <div className="br-marquee flex gap-[18px]">
            {[...JOBS, ...JOBS].map((j, i) => (
              <JobCard key={i} type={j[0]} addr={j[1]} loc={j[2]} meta={j[3]} />
            ))}
          </div>
        </div>
      </section>

      {/* ONE TAP TO A QUOTE */}
      <FeatureRow
        eyebrow="From listing to quote"
        title="See it. Tap it. Quote it."
        lead="Open a listing and you see the work, the site address and how far it is from you. From there, create a quote from the matching template, draft a letter to the occupier, or get directions, all before anyone else has seen the job."
        checks={[
          'Approved applications (ready to build) and brand-new ones, sorted by distance',
          'One tap opens a quote from the matching template, address pre-filled',
          'Draft a branded letter to the occupier, emailed to you to print and post',
          'Save your patch and get a daily alert when new jobs appear',
        ]}
        media={
          <PhoneFrame
            src={`${A}/s-job.png`}
            alt="A planning listing opened: create a quote, draft a letter or get directions"
            className="mx-auto w-[min(290px,78%)]"
          />
        }
        reverse
      />

      {/* HOW IT WORKS */}
      <section className="border-y border-hairline-warm bg-paper-alt py-20 sm:py-28">
        <Rail>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm sm:text-5xl">
            Three taps from postcode to doorstep.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step
              n="1"
              title="Set your patch"
              body="Type your postcode and pick how far you will travel, from half a mile up to fifteen. The Radar fills with work in that ring."
            />
            <Step
              n="2"
              title="Pick the live ones"
              body="Approved and brand-new applications, each with the work type and distance. Sort by nearest and scan what is worth chasing."
            />
            <Step
              n="3"
              title="Get there first"
              body="Turn a listing into a quote in a tap, or draft a letter to the occupier. You are in front of them before the job is advertised."
            />
          </div>
        </Rail>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28">
        <Rail className="max-w-[820px]">
          <FaqJsonLd items={FAQS} />
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm">
            Questions, answered.
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <Faq key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </Rail>
      </section>

      <FinalCta
        title="Find the work before anyone else."
        lead="Planning Radar is included on every plan. Start free for 14 days and see what is being planned on your patch right now."
        primary={{ href: '/signup', label: 'Start free for 14 days' }}
        secondary={{ href: '/features', label: 'See all features' }}
      />
    </main>
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

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-hairline-warm bg-white p-7">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">
        {n}
      </span>
      <h3 className="mt-4 text-xl font-extrabold tracking-tight text-ink-warm">{title}</h3>
      <p className="mt-2 text-base text-ink-soft-warm">{body}</p>
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
