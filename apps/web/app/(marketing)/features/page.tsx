import type { Metadata } from 'next';
import {
  REBRAND as A,
  Rail,
  Eyebrow,
  PrimaryButton,
  GhostLink,
  FeatureRow,
  PhoneFrame,
  BrowserFrame,
  FinalCta,
} from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'Features | Builders Ready',
  description:
    'The full tour: find work with Planning Radar, quote on site from templates, contracts and staged payments, get paid by card or bank, live cost and margin, a timeline and portal your client follows, and a web admin to run it all from the office.',
  alternates: { canonical: 'https://buildersready.uk/features' },
  openGraph: {
    title: 'Features | Builders Ready',
    description: 'Find work, quote, run the job and get paid. The whole job in one app for UK trades.',
    url: 'https://buildersready.uk/features',
    type: 'website',
  },
};

const PHONE = 'mx-auto w-[min(290px,78%)]';

const EXTRAS: [string, string][] = [
  [
    'Decisions inbox',
    'Send a decision with up to six options, each with a photo and a price. The client taps to accept, and the choice is logged forever: who chose, when, and what it cost.',
  ],
  [
    'Variations with signature',
    'Propose a variation with a cost and time impact. The client signs on their phone with a finger. Auto-numbered, timestamped and locked once signed.',
  ],
  [
    'Project handover PDF',
    'One click at the end produces a complete record: quote vs final, every variation, every decision, every update and invoice. The finish that earns referrals.',
  ],
  [
    'Push notifications',
    'Decisions, variations, updates and invoices notify the other party in real time, each deep-linking to the right screen.',
  ],
  [
    'Reports & messaging',
    'Upload engineer reports or surveys for the client to acknowledge, and keep a private chat for the small stuff that doesn’t need a formal record.',
  ],
  [
    'Team & branding',
    'Invite project managers and clients, reassign mid-project, and carry your own logo and colours through the app and every client email. UK GDPR compliant.',
  ],
];

export default function FeaturesPage() {
  return (
    <main>
      {/* HERO */}
      <section className="pt-10 sm:pt-14">
        <Rail>
          <div className="max-w-[44em]">
            <Eyebrow>The full tour</Eyebrow>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-tight text-ink-warm sm:text-6xl">
              Everything the job needs, start to finish.
            </h1>
            <p className="mt-6 text-lg text-ink-soft-warm sm:text-xl">
              Find the work, quote it on site, agree it in writing, run the build, and get paid.
              Every feature is on every plan, on the phone in your pocket and the laptop in the
              office.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <PrimaryButton href="/signup">Start free for 14 days</PrimaryButton>
              <GhostLink href="/pricing">See pricing</GhostLink>
            </div>
          </div>
        </Rail>
      </section>

      {/* FIND WORK */}
      <FeatureRow
        eyebrow="Find work · Planning Radar"
        title="Win the job before it&rsquo;s advertised."
        lead="Planning Radar shows building work being planned near you the moment it hits the public record, sorted by distance. Turn a listing into a quote in a tap, or draft a branded letter to the occupier."
        checks={[
          'Any UK postcode, filtered from half a mile up to fifteen',
          'Approved and brand-new applications, sorted by distance',
          'One tap opens a quote from the matching template',
          'Save your patch for a daily alert, with no per-lead fees',
        ]}
        media={<PhoneFrame src={`${A}/s-radar.png`} alt="Planning Radar listings near you" className={PHONE} />}
        learnMoreHref="/planning-radar"
      />

      {/* QUOTE ON SITE */}
      <FeatureRow
        reverse
        eyebrow="Quote on site"
        title="Price the job in the client&rsquo;s kitchen."
        lead="Start from a trade template and answer a few questions (rooms, coats, surfaces) and Builders Ready builds a costed draft with guideline prices. Every figure stays editable, and you add your margin on top."
        checks={[
          '40+ trade templates that pre-fill the line items',
          'Line-by-line cost build-up: materials, day rate, hourly, fixed',
          'Add your margin %; the client price is worked out for you',
          'Choose what the client sees: full breakdown or a single total',
        ]}
        media={<PhoneFrame src={`${A}/s-quote.png`} alt="Building a quote on site" className={PHONE} />}
      />

      {/* CONTRACT */}
      <FeatureRow
        eyebrow="Agree it in writing"
        title="A contract they sign, and a schedule that gets you paid."
        lead="Turn the accepted quote into a signable contract: your terms plus a clear payment schedule. Split it into a deposit, stage payments and completion, with a retention held back until snagging. The client e-signs before work starts."
        checks={[
          'Milestones as a fixed £ amount or a % of the contract',
          'Optional retention, released after snagging sign-off',
          'Client e-signs on their phone, scope and schedule agreed up front',
          'Raise the invoice for any milestone in one tap when it falls due',
        ]}
        media={<PhoneFrame src={`${A}/s-contract.png`} alt="Contract and payment schedule" className={PHONE} />}
      />

      {/* RUN — TIMELINE */}
      <FeatureRow
        reverse
        eyebrow="Run the job"
        title="A timeline your client can follow."
        lead="Pick the work type and the timeline seeds itself with the right stages, auto-dated from your project dates. Drag stages to in-progress or complete, and post updates with site photos straight from your phone."
        checks={[
          'Stage templates from one step to a full build, all editable',
          'Photo updates upload in the background, even on site over 5G',
          'Each update can flag a decision the client needs to make',
          'Everything rolls into the handover PDF at the end',
        ]}
        media={<PhoneFrame src={`${A}/s-timeline.png`} alt="Project timeline with stages" className={PHONE} />}
      />

      {/* CLIENT PORTAL (web) */}
      <FeatureRow
        eyebrow="Client portal"
        title="Clients who feel looked after."
        lead="Invite a client and they get a clean portal of their own, under your brand: live progress, their money summary, updates with photos, and invoices to pay. The same picture on the web and in the app, so nothing is ever out of sync."
        checks={[
          'Your logo in the header, so they see your business, not ours',
          'Money summary: project value, paid so far, still to pay',
          'Updates, decisions and payable invoices in one place',
          'Project-only view, so invited clients never see the marketplace',
        ]}
        media={<BrowserFrame src={`${A}/s-web-portal.png`} alt="The client web portal" />}
      />

      {/* GET PAID */}
      <FeatureRow
        reverse
        eyebrow="Get paid"
        title="Card, bank or cash, however they want to pay."
        lead="Raise an invoice on its own or straight off a contract milestone, and choose the payment methods per invoice. Card goes through a secure Stripe page into your own account; bank details sit on the invoice; cash is flagged and confirmed."
        checks={[
          'Bill a milestone in a tap, or write a custom invoice',
          'Tick the methods each invoice offers: card, bank, cash',
          'Card money lands in your account; we never hold your funds',
          'A flat £3 per card payment (free on Unlimited), never a percentage',
        ]}
        media={<PhoneFrame src={`${A}/s-newinvoice.png`} alt="Raising an invoice" className={PHONE} />}
      />

      {/* COST & MARGIN */}
      <FeatureRow
        eyebrow="Know your margin"
        title="See your real margin while the job&rsquo;s still live."
        lead="Log materials, labour, plant and subbie costs as you go, snapping the receipt on site. Builders Ready works out your live margin against the contract value, so you spot a job going over before it&rsquo;s too late. It&rsquo;s the one thing the client never sees."
        checks={[
          'Categories: materials, labour, plant, subcontractor, other',
          'Snap and attach a receipt photo to every cost',
          'Live margin vs contract value, updated as you log',
          'Team-only, never visible to the client',
        ]}
        media={<PhoneFrame src={`${A}/s-margin.png`} alt="Costs and margin, team only" className={PHONE} />}
      />

      {/* SCHEDULE & RESOURCES */}
      <FeatureRow
        eyebrow="Schedule & resources"
        title="See where everyone is, and what the week costs."
        lead="Put your team, subcontractors and plant on a week-by-week board across every job at once. Day rates, salaries and subbie costs feed a live scheduled-cost and cashflow view, and double-bookings are flagged in red before they bite."
        checks={[
          'Team, subbies and plant on one timeline, per day',
          'Scheduled cost and cashflow (money out vs stage payments in)',
          'Clash detection flags anyone booked on two jobs at once',
          'Cover-by-trade and per-project schedules, cost and margin',
        ]}
        media={<BrowserFrame src={`${A}/s-web-schedule.png`} alt="The cross-project schedule" />}
      />

      {/* SUBCONTRACTOR NETWORK */}
      <FeatureRow
        reverse
        eyebrow="Your subcontractor network"
        title="Find, hire and manage subbies, all in one place."
        lead="Connect the subs you already use so they see the jobs you book them on and confirm. Need more hands? Switch on your For Hire profile to get found by other builders, browse local tradespeople by trade and area, post a job for bids, and message either way."
        checks={[
          'Invite your subbies free; they see their jobs and confirm',
          'A directory of available tradespeople by trade and area',
          'Post a job, take bids, and hire the winner onto your team',
          'A For Hire profile with your rate, certs and reviews',
        ]}
        media={<PhoneFrame src={`${A}/s-forhire-profile.png`} alt="The For Hire profile" className={PHONE} />}
        learnMoreHref="/subcontractors"
      />

      {/* RUN IT FROM THE OFFICE — desktop band */}
      <section className="border-y border-hairline-warm bg-paper-alt py-20 sm:py-28">
        <Rail>
          <div className="max-w-[44em]">
            <Eyebrow>On the laptop</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold leading-[1.07] tracking-tight text-ink-warm sm:text-5xl">
              Run the whole business from the office.
            </h2>
            <p className="mt-4 text-lg text-ink-soft-warm">
              Everything on the phone is on the web too. Set up, oversight and answering the phone
              happen on a laptop: cross-project finance, quoting, and the same client portal, all in
              your browser.
            </p>
          </div>
          <div className="mt-12">
            <BrowserFrame src={`${A}/dash-web.png`} alt="The Builders Ready web dashboard" />
          </div>
        </Rail>
      </section>

      {/* EVERYTHING ELSE */}
      <section className="py-20 sm:py-28">
        <Rail>
          <Eyebrow>And the rest of the job</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-warm sm:text-5xl">
            The details that keep a build honest.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {EXTRAS.map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-hairline-warm bg-white p-7">
                <h3 className="text-lg font-extrabold tracking-tight text-ink-warm">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft-warm">{body}</p>
              </div>
            ))}
          </div>
        </Rail>
      </section>

      <FinalCta
        title="Every feature. Every plan. 14 days free."
        lead="Bring your next quote across and run the whole job in one place."
        primary={{ href: '/signup', label: 'Start free for 14 days' }}
        secondary={{ href: '/pricing', label: 'See pricing' }}
      />
    </main>
  );
}
