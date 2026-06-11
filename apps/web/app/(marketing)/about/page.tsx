import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Builders Ready',
  description:
    'Builders Ready was built for UK builders of every size — sole traders doing bathrooms, mid-firms doing extensions, large operations doing whole-house refurbs — who are tired of running projects from WhatsApp.',
  alternates: { canonical: 'https://buildersready.uk/about' },
  openGraph: {
    title: 'About — Builders Ready',
    description:
      'Built for every UK builder who deals with clients. By people who have lived the problem.',
    url: 'https://buildersready.uk/about',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <main>
      <section className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            About
          </p>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Built for every UK builder who deals with clients.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-ink-muted md:text-lg">
            Whether you&rsquo;re a sole trader doing kitchen refurbs or a
            multi-PM firm running £400k extensions, the daily admin around
            clients is the same. Builders Ready exists to remove it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <Heading text="Why this exists" />
        <Para>
          The reality of running a client-facing build in the UK — whether
          it&rsquo;s a £15k bathroom or a £400k extension — is that the
          project ends up living across WhatsApp, email, a few PDFs on
          Dropbox, and the margins of a clipboard on site.
        </Para>
        <Para>
          By the end, nobody can remember whether the client said yes to the
          tile choice. The tap variation is in dispute. The quote was X but
          the actual cost is X + variations and nobody&rsquo;s sure exactly
          where the difference came from. The handover folder is &ldquo;in
          progress.&rdquo;
        </Para>
        <Para>
          Every builder we&rsquo;ve spoken to — sole traders, mid-firms,
          large operations — has lived a version of this. Some have built
          spreadsheets to compensate. Some have hired a project
          administrator. Some just accept the chaos.
        </Para>
        <Para>
          Builders Ready replaces the patchwork. Every decision is logged.
          Every variation is signed. Every invoice is tracked. Every photo
          update lives in one timeline. At the end, you generate a single
          PDF that proves you delivered what you promised — and you keep
          your margin intact along the way.
        </Para>

        <Heading text="How this started" />
        <Para>
          The platform began as a single-tenant tool for a UK residential
          builder. After eighteen months of refining it against real
          projects, real disputes and real handover documents, we rebuilt it
          as a multi-tenant SaaS and opened it up to other builders.
        </Para>
        <Para>
          What you&rsquo;re looking at isn&rsquo;t a software company trying
          to break into construction. It&rsquo;s a piece of software shaped
          by people who&rsquo;ve been on the inside of a build that went
          wrong and didn&rsquo;t want to be there again.
        </Para>

        <Heading text="What we believe" />
        <ul className="space-y-3 text-base text-ink-muted">
          <Belief
            title="Mobile-first, but never mobile-only."
            body="Clients live on their phone. Builders work on a phone and a laptop. We build for both — first-class web admin, first-class mobile, no second-class citizens."
          />
          <Belief
            title="Privacy is a feature, not an obligation."
            body="UK GDPR compliant by design. Data hosted in the UK and EU. Row-level security on every table. We don't sell data. We don't share it with advertisers."
          />
          <Belief
            title="Clarity in pricing."
            body="All features at every tier. Tier scales with active projects, not unlock keys. No surprise fees. Cancel any time inside the app."
          />
          <Belief
            title="Honest about what we don't do."
            body="We're not a CRM. We're not a quoting tool. We're not a payroll system. We do the live-project layer — between contract signing and handover. That's the layer that's currently a mess."
          />
        </ul>

        <Heading text="Get in touch" />
        <Para>
          Product feedback, sales enquiries, press, partnerships — all the
          same address.
        </Para>
        <a
          href="mailto:info@buildersready.uk"
          className="mt-4 inline-block text-base font-bold text-primary hover:underline"
        >
          info@buildersready.uk
        </a>
      </section>

      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center text-white">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight">
            See it in action.
          </h2>
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

function Heading({ text }: { text: string }) {
  return (
    <h2 className="mb-4 mt-10 text-2xl font-extrabold tracking-tight first:mt-0">
      {text}
    </h2>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-base leading-relaxed text-ink-muted">{children}</p>
  );
}

function Belief({ title, body }: { title: string; body: string }) {
  return (
    <li>
      <strong className="block text-base font-bold text-ink">{title}</strong>
      <span className="text-ink-muted">{body}</span>
    </li>
  );
}
