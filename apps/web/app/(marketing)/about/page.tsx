import type { Metadata } from 'next';
import { Rail, Eyebrow, FinalCta } from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'About | Builders Ready',
  description:
    'Builders Ready was built for UK builders of every size (sole traders doing bathrooms, mid-firms doing extensions, large operations doing whole-house refurbs) who are tired of running projects from WhatsApp.',
  alternates: { canonical: 'https://buildersready.uk/about' },
  openGraph: {
    title: 'About | Builders Ready',
    description:
      'Built for every UK builder who deals with clients. By people who have lived the problem.',
    url: 'https://buildersready.uk/about',
    type: 'website',
  },
};

const BELIEFS: [string, string][] = [
  [
    'Mobile-first, but never mobile-only.',
    'Clients live on their phone. Builders work on a phone and a laptop. We build for both: first-class web admin, first-class mobile, no second-class citizens.',
  ],
  [
    'Privacy is a feature, not an obligation.',
    'UK GDPR compliant by design. Data hosted in the UK and EU. Row-level security on every table. We do not sell your data or share it with advertisers.',
  ],
  [
    'Clarity in pricing.',
    'Every feature on every tier. Price scales with active projects, not unlock keys. No surprise fees. Cancel any time inside the app.',
  ],
  [
    'Honest about what we do, and don&rsquo;t.',
    'We run the whole client-facing job: quotes, contracts and staged payments, the live build with signed decisions and variations, get-paid-to-your-bank, and a one-tap handover. We are not your accountant, payroll or takeoff software; we sit alongside those.',
  ],
];

export default function AboutPage() {
  return (
    <main>
      {/* HERO */}
      <section className="pt-10 sm:pt-14">
        <Rail className="max-w-[820px]">
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-tight text-ink-warm sm:text-6xl">
            Built for every UK builder who deals with clients.
          </h1>
          <p className="mt-6 text-lg text-ink-soft-warm sm:text-xl">
            Whether you&rsquo;re a decorator doing two rooms or a multi-PM firm running £400k
            extensions, the daily admin around clients is the same. Builders Ready exists to remove
            it. The whole job, quote to final payment.
          </p>
        </Rail>
      </section>

      {/* BODY */}
      <section className="py-16 sm:py-20">
        <Rail className="max-w-[720px]">
          <Section title="Why this exists">
            <P>
              The reality of running a client-facing build in the UK, whether it&rsquo;s a £15k
              bathroom or a £400k extension, is that the project ends up living across WhatsApp,
              email, a few PDFs on Dropbox, and the margins of a clipboard on site.
            </P>
            <P>
              By the end, nobody can remember whether the client said yes to the tile choice. The
              tap variation is in dispute. The quote was X but the actual cost is X plus variations
              and nobody is sure where the difference came from. The handover folder is &ldquo;in
              progress&rdquo;.
            </P>
            <P>
              Every builder we&rsquo;ve spoken to, from sole traders to mid-firms to large operations, has
              lived a version of this. Some build spreadsheets to compensate. Some hire a project
              administrator. Some just accept the chaos.
            </P>
            <P>
              Builders Ready replaces the patchwork with the whole client-facing job in one place. You
              quote on site and the client signs. Every decision is logged, every variation is
              signed, every photo update lives in one timeline. Clients pay by card or bank straight
              to your account, and at the end you generate a single handover PDF that proves you
              delivered what you promised, with your margin tracked the whole way.
            </P>
          </Section>

          <Section title="How this started">
            <P>
              The platform began as a single-tenant tool for a UK residential builder. After
              eighteen months of refining it against real projects, real disputes and real handover
              documents, we rebuilt it as a multi-tenant product and opened it up to other builders.
            </P>
            <P>
              What you&rsquo;re looking at isn&rsquo;t a software company trying to break into
              construction. It&rsquo;s a piece of software shaped by people who have been on the
              inside of a build that went wrong and didn&rsquo;t want to be there again.
            </P>
          </Section>

          <Section title="What we believe">
            <ul className="space-y-5">
              {BELIEFS.map(([t, b]) => (
                <li key={t}>
                  <strong
                    className="block text-lg font-extrabold tracking-tight text-ink-warm"
                    dangerouslySetInnerHTML={{ __html: t }}
                  />
                  <span className="text-base text-ink-soft-warm" dangerouslySetInnerHTML={{ __html: b }} />
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Get in touch">
            <P>Product feedback, sales enquiries, press, partnerships: all the same address.</P>
            <a
              href="mailto:info@buildersready.uk"
              className="mt-2 inline-block text-base font-bold text-primary hover:underline"
            >
              info@buildersready.uk
            </a>
          </Section>
        </Rail>
      </section>

      <FinalCta
        title="See it in action."
        lead="Start free for 14 days and run your next job in one place."
        primary={{ href: '/signup', label: 'Start free trial' }}
        secondary={{ href: '/features', label: 'See all features' }}
      />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-12 first:mt-0">
      <h2 className="text-2xl font-extrabold tracking-tight text-ink-warm">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-base leading-relaxed text-ink-soft-warm">{children}</p>;
}
