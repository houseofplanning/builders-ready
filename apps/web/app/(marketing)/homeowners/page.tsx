import type { Metadata } from 'next';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';
import {
  REBRAND as A,
  Rail,
  Eyebrow,
  PrimaryButton,
  GhostLink,
  PhoneFrame,
  BrowserFrame,
  FeatureRow,
  FinalCta,
} from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'For homeowners: post a job, get quotes from local trades | Builders Ready',
  description:
    'Tell Builders Ready what you need doing and local trades come to you with quotes. Compare them side by side, hire with confidence, then follow the whole job from one app: photos, decisions and payments. Free to post, no obligation.',
  alternates: { canonical: 'https://buildersready.uk/homeowners' },
  openGraph: {
    title: 'Builders Ready for homeowners: post a job, get quotes',
    description:
      'Post what you need, compare quotes from local trades, and run the whole job from one app.',
    url: 'https://buildersready.uk/homeowners',
    type: 'website',
    siteName: 'Builders Ready',
  },
};

const STEPS: [string, string, string][] = [
  ['1', 'Post your job', 'A few details and photos of what you need doing. A couple of minutes, no phone calls, no site visits to arrange.'],
  ['2', 'Compare quotes', 'Local trades send itemised quotes with their rate, when they can start and what is covered. See their profile and reviews before you decide.'],
  ['3', 'Hire & follow the job', 'Pick your trade and the job moves into one place: a live timeline, decisions you approve with a tap, and payments only when work is signed off.'],
];

const WHY: [string, string][] = [
  ['Quotes you can compare', 'Every quote is itemised (labour, materials, timings) so you are comparing like for like, not three numbers on the back of a card.'],
  ['See who you&rsquo;re hiring', 'Trade profiles show their work, their reviews from other homeowners, and how they responded to you, before you commit a penny.'],
  ['Updates from site', 'Your trade posts photos and progress as the job runs. You see what is happening without having to be there or chase.'],
  ['Decisions in writing', 'Choices and changes, like tiles, a moved socket or an extra day, come to you with a price. You approve with a tap, and every yes is recorded.'],
  ['Pay when it&rsquo;s done', 'Pay by card or bank when a stage is signed off, or settle in cash and have it logged. No awkward “can you transfer the deposit today” calls.'],
  ['A handover at the end', 'When the job is finished you get a clean PDF of the whole project to keep: what was done, what was agreed, what was paid.'],
];

const FAQS = [
  {
    q: 'What does it cost a homeowner to use Builders Ready?',
    a: 'Posting a job and getting quotes costs you nothing. You create an account, describe the work, and local trades come to you. You only ever pay the trade you hire, for the work they do.',
  },
  {
    q: 'Do I have to hire someone once I post a job?',
    a: 'No. Posting a job just opens it up to local trades. You read their quotes and profiles and decide who, if anyone, to hire. There is no obligation.',
  },
  {
    q: 'How do I pay the trade?',
    a: 'Pay milestone invoices by card or bank through the app when a stage is signed off, or agree to pay in cash and have it logged. Either way there is a clear record of what was paid and when.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. Post a job and run the whole project from the Builders Ready app on iOS or Android, or from the website, whichever you prefer.',
  },
];

export default function HomeownersPage() {
  return (
    <main>
      {/* HERO */}
      <section className="pt-10 sm:pt-14">
        <Rail>
          <div className="grid items-center gap-12 pb-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div>
              <Eyebrow>For homeowners</Eyebrow>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-tight text-ink-warm sm:text-6xl">
                Describe the job. Local trades come to you.
              </h1>
              <p className="mt-6 max-w-[32em] text-lg text-ink-soft-warm sm:text-xl">
                Post what you need doing, from a leaking tap to a new bathroom to a full extension, and get
                quotes from local trades. Compare them side by side, pick the right one, then follow
                the whole job from your phone.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <PrimaryButton href="/signup/customer">Post a job for free</PrimaryButton>
                <GhostLink href="#how-it-works">See how it works</GhostLink>
              </div>
              <p className="mt-8 text-sm font-semibold text-ink-muted-warm">
                Free to post · no obligation · you choose who to hire.
              </p>
            </div>

            <div className="flex justify-center">
              <PhoneFrame
                src={`${A}/s-postjob.png`}
                alt="Posting a job on Builders Ready"
                float
                className="w-[min(290px,78%)]"
              />
            </div>
          </div>
        </Rail>
      </section>

      {/* STEPS */}
      <section className="pt-16 sm:pt-20">
        <Rail>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(([n, title, body]) => (
              <div key={n} className="rounded-2xl border border-hairline-warm bg-white p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">
                  {n}
                </span>
                <h3 className="mt-4 text-xl font-extrabold tracking-tight text-ink-warm">{title}</h3>
                <p className="mt-2 text-base text-ink-soft-warm">{body}</p>
              </div>
            ))}
          </div>
        </Rail>
      </section>

      {/* YOUR PROJECT PAGE — the portal homeowners get */}
      <FeatureRow
        eyebrow="Your project page"
        title="Watch the job come together."
        lead="Once you hire a trade, you get your own project page under their brand. See how far along the build is, every update with photos from site, the decisions you need to make, and any invoice to pay. Open it on your phone or your laptop; it&rsquo;s the same picture."
        checks={[
          'A live progress bar and the current stage of the build',
          'Photo updates from site, so you can follow without being there',
          'Your money summary: project value, paid so far, still to pay',
          'Decisions and invoices in one place, nothing lost in texts',
        ]}
        media={<BrowserFrame src={`${A}/s-web-portal.png`} alt="Your project page in Builders Ready" />}
        reverse
      />

      {/* WHY / HOW IT WORKS */}
      <section id="how-it-works" className="border-y border-hairline-warm bg-paper-alt py-20 sm:py-28">
        <Rail>
          <div className="max-w-[42em]">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold leading-[1.07] tracking-tight text-ink-warm sm:text-5xl">
              One place for the whole job, not a WhatsApp group.
            </h2>
            <p className="mt-4 text-lg text-ink-soft-warm">
              Most building work goes wrong in the gaps: the verbal yes nobody wrote down, the
              extra that turns up on the final bill. Builders Ready keeps it all in writing, in one
              app you and your trade both see.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {WHY.map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-hairline-warm bg-white p-7">
                <h3 className="text-lg font-extrabold tracking-tight text-ink-warm" dangerouslySetInnerHTML={{ __html: title }} />
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft-warm" dangerouslySetInnerHTML={{ __html: body }} />
              </div>
            ))}
          </div>
        </Rail>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28">
        <Rail className="max-w-[820px]">
          <FaqJsonLd items={FAQS} />
          <Eyebrow>Homeowner questions</Eyebrow>
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
        title="Got a job that needs doing?"
        lead="Post it in a couple of minutes and let local trades come to you. Free, with no obligation."
        primary={{ href: '/signup/customer', label: 'Post a job' }}
        secondary={{ href: '/login', label: 'Sign in' }}
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
