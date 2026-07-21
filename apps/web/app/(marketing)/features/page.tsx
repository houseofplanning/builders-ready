import Link from 'next/link';
import type { Metadata } from 'next';
import {
  MockupProjectGrid,
  MockupDecision,
  MockupVariation,
  MockupDashboard,
} from '@/components/marketing/mockups';

export const metadata: Metadata = {
  title: 'Features — Builders Ready',
  description:
    'Every feature of Builders Ready: project timeline, decisions inbox, variations with client signature, live finance summary, project handover PDF, push notifications, web admin. Built for UK builders of every size.',
  alternates: { canonical: 'https://buildersready.uk/features' },
  openGraph: {
    title: 'Features — Builders Ready',
    description:
      'Every feature: timeline, decisions, variations, finance, handover PDF, web admin.',
    url: 'https://buildersready.uk/features',
    type: 'website',
  },
};

export default function FeaturesPage() {
  return (
    <main>
      {/* HERO */}
      <section className="border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            What you get
          </p>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Every feature, on every plan.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-ink-muted md:text-lg">
            Builders Ready isn&rsquo;t feature-gated. Whether you&rsquo;re a
            sole trader on Starter at £29 or a multi-PM firm on Unlimited at
            £149, you get the entire product. Tier price scales with active
            project count, never functionality.
          </p>
        </div>
      </section>

      {/* DECISIONS */}
      <FeatureRow
        eyebrow="Decisions inbox"
        title="End the &ldquo;we never agreed to that&rdquo; argument."
        body="Send your client a decision with multiple options. Tile colour. Pendant lights. Kitchen handle finish. Each option can include a photo, description and price. The client taps to accept on their phone. The choice is logged forever — who decided, when, what they chose, what it cost."
        bullets={[
          'Up to 6 options per decision with photos and prices',
          'Optional deadline so the client knows when you need an answer',
          'Owner / PM can also accept on the client&rsquo;s behalf when they confirm by phone — with full audit trail',
          'Every accepted decision flows into the handover PDF',
        ]}
        mockup={<MockupDecision className="h-auto w-full max-w-[260px] mx-auto drop-shadow-xl" />}
      />

      {/* VARIATIONS */}
      <FeatureRow
        eyebrow="Variations with signature"
        title="Disputes over scope creep, gone."
        body="Halfway through the kitchen the client wants a Quooker instead of the Franke you priced for. Propose a variation: title, description, cost delta, time impact. The client signs on their phone with their finger. Legally clear, audit-trailed, and ready for the handover document."
        bullets={[
          'Auto-numbered V001, V002… so nothing slips through',
          'Cost in £ (positive or negative) and time impact in days',
          'Finger-signature captured with timestamp',
          'Withdraw before signing if you reconsider',
          'Once signed, locked — appears on the handover PDF',
        ]}
        mockup={<MockupVariation className="h-auto w-full max-w-[260px] mx-auto drop-shadow-xl" />}
        reverse
      />

      {/* FINANCE */}
      <FeatureRow
        eyebrow="Live project finance"
        title="Quote vs final at a glance."
        body="Every project shows original quote, variations to date, invoiced, paid and outstanding — updated in real time as variations are signed and invoices are marked paid. Your client sees the same numbers you do, so there&rsquo;s no surprise at handover."
        bullets={[
          'Original quote captured at project start',
          'Variations roll into the &ldquo;contracted value&rdquo; the moment they&rsquo;re signed',
          'Invoiced and paid totals from the invoices section',
          'Dashboard rolls every active project into a single owner-level total',
        ]}
        mockup={<MockupDashboard className="h-auto w-full rounded-xl shadow-2xl ring-1 ring-hairline" />}
      />

      {/* HANDOVER */}
      <FeatureRow
        eyebrow="Project handover PDF"
        title="One document the client keeps forever."
        body="At the end of every project, generate a complete handover PDF in one click. Quote vs final, every variation, every signed-off decision, every update with photos, every invoice. The kind of professional record that gets referrals."
        bullets={[
          'Generated server-side in seconds — no exporting, no formatting',
          'Includes timeline, every update, every decision outcome, every variation, every invoice',
          'Builder bank details and Companies House number embedded for client records',
          'Re-generate as many times as you need before final handover',
        ]}
        mockup={<HandoverPdfMockup />}
        reverse
      />

      {/* TIMELINE & UPDATES */}
      <FeatureRow
        eyebrow="Timeline & photo updates"
        title="Post progress from the van."
        body="Built-in 8-stage construction timeline auto-generated from your project dates. Drag stages to in-progress / complete. Post updates with site photos straight from your phone&rsquo;s camera roll — your client sees them within seconds."
        bullets={[
          'Default 8 stages, fully renamable and re-timeable per project',
          'Photos compressed and uploaded in the background — works on site over LTE',
          'Each update can flag a decision the client needs to make',
          'Updates roll into the handover PDF chronologically',
        ]}
        mockup={<MockupProjectGrid className="h-auto w-full max-w-[260px] mx-auto drop-shadow-xl" />}
      />

      {/* PUSH */}
      <FeatureRow
        eyebrow="Push notifications"
        title="The other party knows within seconds."
        body="When you raise a decision, your client gets a push notification with the decision title. When they accept, you get a push back. Same for variations, updates, and invoices. No more &ldquo;did you see my message?&rdquo;"
        bullets={[
          'Sent in real time via Apple Push and Expo&rsquo;s native infrastructure',
          'Each notification deep-links straight to the relevant screen',
          'Client and builder can both opt out from Settings',
        ]}
        mockup={<PushMockup />}
        reverse
      />

      {/* DASHBOARD */}
      <FeatureRow
        eyebrow="Web admin"
        title="Run the business from a laptop."
        body="The web admin is where setup, oversight and answering-the-phone happens. Create projects in 60 seconds. See cross-project finance across every active job. Open the dashboard while a client is on the phone and tell them exactly where you&rsquo;re at."
        bullets={[
          'Cross-project KPIs: contracted, invoiced, paid, outstanding',
          'Outstanding-items panels: open decisions, variations awaiting signature, unpaid invoices',
          'Per-project: raise decisions, propose variations, create invoices, upload PDF reports',
          'Team management: invite PMs and clients, reassign mid-project',
        ]}
        mockup={<MockupDashboard className="h-auto w-full rounded-xl shadow-2xl ring-1 ring-hairline" />}
      />

      {/* OTHER */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="mb-3 text-center text-3xl font-extrabold tracking-tight">
            Plus everything else you&rsquo;d expect.
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-sm text-ink-muted">
            The boring-but-essential features that make a SaaS feel solid.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            <SmallFeature
              title="Invoicing"
              body="Auto-numbered invoices, status tracking, mark-paid with bank reference."
            />
            <SmallFeature
              title="Reports"
              body="Weekly notes or upload PDFs (engineer reports, surveys). Acknowledged by the client."
            />
            <SmallFeature
              title="Messaging"
              body="Private chat between PM and client — for the small stuff that doesn&rsquo;t need a record."
            />
            <SmallFeature
              title="Team management"
              body="Invite PMs, invite clients per project, reassign in two clicks if someone moves on."
            />
            <SmallFeature
              title="Project archiving"
              body="Finished projects free up your tier slot but keep all data — for handover and referral."
            />
            <SmallFeature
              title="Stripe billing"
              body="14-day free trial, Stripe checkout, customer portal for upgrading/cancelling."
            />
            <SmallFeature
              title="Branded experience"
              body="Your logo and brand colours throughout the mobile app and client emails."
            />
            <SmallFeature
              title="UK GDPR compliant"
              body="Data hosted in the UK and EU only. Full audit trail of every action."
            />
            <SmallFeature
              title="Multi-PM"
              body="Larger firms with multiple project managers — assign one PM per project."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center text-white">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight">
            14 days to see if it&rsquo;s for you.
          </h2>
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-primary hover:opacity-95"
          >
            Start free trial →
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  bullets,
  mockup,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  mockup: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className={reverse ? 'md:order-2' : ''}>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary">
              {eyebrow}
            </p>
            <h2
              className="mb-5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl"
              // dangerouslySetInnerHTML allows HTML entities (&ldquo; etc) in the source above
              dangerouslySetInnerHTML={{ __html: title }}
            />
            <p className="text-base text-ink-muted">{body}</p>
            <ul className="mt-7 space-y-3 text-sm">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
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
                  <span
                    className="text-ink"
                    dangerouslySetInnerHTML={{ __html: b }}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className={reverse ? 'md:order-1' : ''}>{mockup}</div>
        </div>
      </div>
    </section>
  );
}

function SmallFeature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-6">
      <h3 className="mb-2 text-sm font-extrabold">{title}</h3>
      <p
        className="text-xs text-ink-muted"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

function HandoverPdfMockup() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-lg bg-white p-8 shadow-2xl ring-1 ring-hairline">
      <div className="border-b border-hairline pb-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-primary">
          BUILDERS READY · PROJECT HANDOVER
        </p>
        <p className="text-[8px] text-ink-muted">Generated 16 May 2026</p>
      </div>
      <h3 className="mt-4 text-lg font-extrabold leading-tight">
        Hammersmith Townhouse
      </h3>
      <p className="text-[10px] text-ink-muted">42 Larch Road · London W6 9AB</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <PdfTile label="Quote" value="£285k" />
        <PdfTile label="Variations" value="£8k" />
        <PdfTile label="Final" value="£293k" />
        <PdfTile label="Paid" value="£293k" />
      </div>
      <div className="mt-5 text-[10px]">
        <p className="font-bold uppercase tracking-wider text-ink-muted">
          Decisions accepted
        </p>
        <ul className="mt-2 space-y-1 text-ink">
          <li>Splashback tile — Calacatta marble (£950)</li>
          <li>Pendant lights — Bronze cone trio (£840)</li>
          <li>Floor finish — Engineered oak HW1 (£12,400)</li>
        </ul>
      </div>
      <div className="mt-5 text-[10px]">
        <p className="font-bold uppercase tracking-wider text-ink-muted">
          Variations signed
        </p>
        <ul className="mt-2 space-y-1 text-ink">
          <li>V001 Underfloor heating en-suite (+£1,840, +2 days)</li>
          <li>V002 Upgrade kitchen taps (+£1,290, 0 days)</li>
        </ul>
      </div>
      <div className="mt-5 text-[8px] text-ink-muted">
        Page 1 of 12 · Heritage Build Co · Companies House 12345678
      </div>
    </div>
  );
}

function PdfTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-canvas p-2">
      <div className="text-[7px] font-bold uppercase tracking-widest text-ink-muted">
        {label}
      </div>
      <div className="text-sm font-extrabold">{value}</div>
    </div>
  );
}

function PushMockup() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <PushItem
        time="now"
        title="Heritage Build Co"
        body="Decision needed: Splashback tile choice"
      />
      <PushItem
        time="2m ago"
        title="Heritage Build Co"
        body="Lara accepted: Pendant lights — bronze cone trio"
      />
      <PushItem
        time="5m ago"
        title="Heritage Build Co"
        body="V002 signed: Upgrade kitchen taps (+£1,290)"
      />
    </div>
  );
}

function PushItem({
  time,
  title,
  body,
}: {
  time: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-hairline backdrop-blur">
      <div className="flex items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <span className="text-[8px] font-bold text-white">BR</span>
        </div>
        <div className="ml-2 flex-1">
          <p className="text-[10px] font-bold text-ink">{title}</p>
          <p className="text-[10px] text-ink">{body}</p>
        </div>
        <span className="text-[9px] text-ink-muted">{time}</span>
      </div>
    </div>
  );
}
