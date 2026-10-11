import Link from 'next/link';
import type { Metadata } from 'next';
import { FaqJsonLd } from '@/components/marketing/faq-jsonld';

export const metadata: Metadata = {
  title: 'For homeowners — post a job, get quotes from local trades | Builders Ready',
  description:
    'Tell Builders Ready what you need doing and local trades come to you with quotes. Compare them side by side, hire with confidence, then follow the whole job — photos, decisions and payments — from one app.',
  alternates: { canonical: 'https://buildersready.uk/homeowners' },
  openGraph: {
    title: 'Builders Ready for homeowners — post a job, get quotes',
    description:
      'Post what you need, compare quotes from local trades, and run the whole job from one app.',
    url: 'https://buildersready.uk/homeowners',
    type: 'website',
    siteName: 'Builders Ready',
  },
};

export default function HomeownersPage() {
  return (
    <main>
      {/* HERO */}
      <section className="bg-gradient-to-b from-canvas to-white">
        <div className="mx-auto max-w-5xl px-6 pt-16 text-center md:pt-24">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            For homeowners
          </p>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
            Describe the job.{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Local trades come to you.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-muted md:text-lg">
            Post what you need doing — a leaking tap, a new bathroom, a full
            extension — and get quotes from local trades. Compare them side by
            side, pick the right one, then follow the whole job from your phone:
            photos from site, decisions you approve, and payments when work is
            signed off.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup/customer"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-card hover:opacity-95"
            >
              Post a job
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-lg border border-hairline bg-white px-6 py-3 text-sm font-bold text-ink hover:bg-canvas"
            >
              See how it works →
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            No obligation · You choose who to hire · UK GDPR compliant
          </p>
        </div>

        {/* Step strip */}
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-12 md:pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            <StepCard
              n="1"
              title="Post your job"
              body="A few details and photos of what you need doing. Takes a couple of minutes — no phone calls, no site visits to arrange."
            />
            <StepCard
              n="2"
              title="Compare quotes"
              body="Local trades send itemised quotes with their rate, when they can start and what's covered. See their profile and reviews before you decide."
            />
            <StepCard
              n="3"
              title="Hire & follow the job"
              body="Pick your trade and the job moves into one place: a live timeline, decisions you approve with a tap, and payments only when work is signed off."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mx-auto mb-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            One place for the whole job — not a WhatsApp group.
          </h2>
          <p className="mx-auto max-w-2xl text-base text-ink-muted">
            Most building work goes wrong in the gaps — the verbal &ldquo;yes&rdquo; nobody
            wrote down, the extra that turns up on the final bill. Builders Ready
            keeps it all in writing, in one app you and your trade both see.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <WhyCard
            title="Quotes you can compare"
            body="Every quote is itemised — labour, materials, timings — so you're comparing like for like instead of three numbers scribbled on the back of a card."
          />
          <WhyCard
            title="See who you're hiring"
            body="Trade profiles show their work, their reviews from other homeowners, and how they responded to you — before you commit a penny."
          />
          <WhyCard
            title="Updates from site"
            body="Your trade posts photos and progress as the job runs. You see what's happening without having to be there or chase for an update."
          />
          <WhyCard
            title="Decisions in writing"
            body="Choices and changes — tiles, a moved socket, an extra day's work — come to you with a price. You approve them with a tap, and there's a record of every yes."
          />
          <WhyCard
            title="Pay when it's done"
            body="Pay by card or bank when a stage is signed off, or settle in cash and have it logged. No awkward 'can you transfer the deposit today' phone calls."
          />
          <WhyCard
            title="A handover at the end"
            body="When the job's finished you get a clean PDF of the whole project — what was done, what was agreed, what was paid — to keep for your records."
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <FaqJsonLd
          items={[
            {
              q: 'What does it cost a homeowner to use Builders Ready?',
              a: 'Posting a job and getting quotes costs you nothing — you create an account, describe the work, and local trades come to you. You only ever pay the trade you hire, for the work they do.',
            },
            {
              q: 'Do I have to hire someone once I post a job?',
              a: 'No. Posting a job just opens it up to local trades. You read their quotes and profiles and decide who — if anyone — to hire. There is no obligation.',
            },
            {
              q: 'How do I pay the trade?',
              a: 'You can pay milestone invoices by card or bank straight through the app when a stage of work is signed off, or agree to pay in cash and have it logged. Either way there is a clear record of what was paid and when.',
            },
            {
              q: 'Can I use it on my phone?',
              a: 'Yes. Post a job and run the whole project from the Builders Ready app on iOS or Android, or from the website — whichever you prefer.',
            },
          ]}
        />
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight">
          Homeowner questions
        </h2>
        <div className="space-y-6">
          <Faq
            q="What does it cost a homeowner to use Builders Ready?"
            a="Posting a job and getting quotes costs you nothing — you create an account, describe the work, and local trades come to you. You only ever pay the trade you hire, for the work they do."
          />
          <Faq
            q="Do I have to hire someone once I post a job?"
            a="No. Posting a job just opens it up to local trades. You read their quotes and profiles and decide who — if anyone — to hire. There's no obligation."
          />
          <Faq
            q="How do I pay the trade?"
            a="You can pay milestone invoices by card or bank straight through the app when a stage of work is signed off, or agree to pay in cash and have it logged. Either way there's a clear record of what was paid and when."
          />
          <Faq
            q="Can I use it on my phone?"
            a="Yes. Post a job and run the whole project from the Builders Ready app on iOS or Android, or from the website — whichever you prefer."
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center text-white">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            Got a job that needs doing?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base opacity-90">
            Post it in a couple of minutes and let local trades come to you.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/signup/customer"
              className="inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-primary hover:opacity-95"
            >
              Post a job →
            </Link>
            <Link
              href="/login"
              className="inline-block rounded-lg border border-white/60 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-6 shadow-card">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
        {n}
      </div>
      <h3 className="text-base font-extrabold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

function WhyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-7 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <h3 className="mb-2 text-base font-extrabold">{title}</h3>
      <p className="text-sm text-ink-muted">{body}</p>
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
