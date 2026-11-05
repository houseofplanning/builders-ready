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

const PHONE = 'mx-auto w-[min(290px,78%)]';

export const metadata: Metadata = {
  title: 'Subcontractors & For Hire | Builders Ready',
  description:
    'Connect your subbies, find local tradespeople, post jobs for bids, and get hired by other builders. One profile for the work you give and the work you get.',
  openGraph: {
    title: 'Subcontractors & For Hire | Builders Ready',
    description:
      'Connect your subbies, find local tradespeople, post jobs for bids, and get hired by other builders.',
  },
};

export default function SubcontractorsPage() {
  return (
    <main>
      {/* HERO */}
      <section className="pt-10 sm:pt-14">
        <Rail>
          <div className="max-w-[46em]">
            <Eyebrow>Subcontractors &amp; For Hire</Eyebrow>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-tight text-ink-warm sm:text-6xl">
              The work you give, and the work you get.
            </h1>
            <p className="mt-6 text-lg text-ink-soft-warm sm:text-xl">
              Connect the subbies you already use so they see their jobs and confirm. Need more
              hands? Find local tradespeople and hire them in a tap. Short of work yourself? Flip to
              your For Hire profile and get found by other builders. One account, one switch.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <PrimaryButton href="/signup">Start free for 14 days</PrimaryButton>
              <GhostLink href="/features">See all features</GhostLink>
            </div>
          </div>
        </Rail>
      </section>

      {/* CONNECT YOUR SUBBIES */}
      <FeatureRow
        eyebrow="Connect your team"
        title="Your subbies see their jobs and confirm."
        lead="Invite a subcontractor or operative and they join free. From then on, the jobs you book them on show up in their app with the dates and site details, they confirm they&rsquo;re coming, and you both get a notification. No more ringing round the night before."
        checks={[
          'Invite by email; they join free, no subscription',
          'They see each job with dates, site and a contact',
          'One tap to confirm, so you know who&rsquo;s turning up',
          'Their rate and cost feed your schedule and margin',
        ]}
        media={<PhoneFrame src={`${A}/s-forhire-home.png`} alt="The My Builder / For Hire switch" className={PHONE} />}
      />

      {/* FIND & HIRE */}
      <FeatureRow
        reverse
        eyebrow="Find more hands"
        title="A directory of available tradespeople."
        lead="Browse local tradespeople who are available for work, filtered by trade and area, each with their day rate, reviews and certificates. Add one to your team in a tap, or post the job and let bids come to you, then hire the winner."
        checks={[
          'Search by trade and area; see rate, reviews and certs',
          'Add someone to your team and schedule them straight away',
          'Or post a job and take bids, then hire the best',
          'Message either way, all in one place',
        ]}
        media={<BrowserFrame src={`${A}/s-web-forhire.png`} alt="Find subbies and the For Hire directory" />}
      />

      {/* GET HIRED */}
      <FeatureRow
        eyebrow="Get hired"
        title="Switch on For Hire and win work."
        lead="Flip to your For Hire profile and other builders can find you. Set your rate and the trades you cover, upload your cards and insurances, and bid on jobs builders post. Everything you do builds a profile and a rating that gets you the next job."
        checks={[
          'A free profile; pay only when you want to be found for work',
          'List your rate, trades, area and upload your certificates',
          'Bid on jobs other builders post near you',
          'Reviews and a rating that grow with every job',
        ]}
        media={<PhoneFrame src={`${A}/s-forhire-jobs.png`} alt="Finding and bidding on jobs" className={PHONE} />}
      />

      <FinalCta
        title="One profile for both sides of the trade."
        lead="Give work, get work, and keep it all in the app you already run your jobs in."
        primary={{ href: '/signup', label: 'Start free for 14 days' }}
        secondary={{ href: '/pricing', label: 'See pricing' }}
      />
    </main>
  );
}
