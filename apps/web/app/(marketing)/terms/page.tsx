import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions · Builders Ready',
  description:
    'The terms that govern your use of Builders Ready — the multi-tenant SaaS portal for UK construction businesses.',
};

const LAST_UPDATED = '18 May 2026';
const COMPANY = 'Mehraj Consultancy Ltd';
const COMPANIES_HOUSE = '14161216';
// Registered office is not displayed publicly — see Companies House register.
// Replace with a virtual-office address once one is in place.
const CONTACT_EMAIL = 'info@buildersready.uk';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-muted">
          BUILDERS READY
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Terms and Conditions
        </h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>
      </header>

      <article className="prose-content space-y-6 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="text-xl font-extrabold">1. Who we are and what these terms cover</h2>
          <p>
            Builders Ready is a software service operated by <strong>{COMPANY}</strong>, a
            company registered in England and Wales with company number {COMPANIES_HOUSE}{' '}
            (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). Our registered office details
            are on file with Companies House.
          </p>
          <p>
            These Terms and Conditions (these &quot;Terms&quot;) form a binding agreement
            between you (the &quot;Builder&quot;, &quot;Customer&quot;, &quot;you&quot;) and us.
            They govern your access to and use of the Builders Ready software-as-a-service
            platform, including the web application at <code>buildersready.uk</code> and the
            Builders Ready mobile application (together, the &quot;Service&quot;).
          </p>
          <p>
            By creating an account, clicking &quot;I agree&quot;, or otherwise accessing the
            Service, you confirm you have read, understood and agree to be bound by these Terms.
            If you don&apos;t agree, don&apos;t use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">2. Definitions</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Tenant</strong> — your business&apos;s isolated workspace within the
              Service, including your branding, projects, team members and clients.
            </li>
            <li>
              <strong>Project Manager / PM</strong> — a user you invite to your Tenant who can
              manage projects on your behalf.
            </li>
            <li>
              <strong>Client</strong> — an end customer of your business that you invite to view
              the projects you manage for them.
            </li>
            <li>
              <strong>Client Data</strong> — data your Tenant uploads or generates about
              projects, including photos, messages, decisions, variations and invoices.
            </li>
            <li>
              <strong>Subscription</strong> — the recurring paid plan you choose from the
              tiers we offer (currently Starter, Pro or Unlimited).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">3. The Service</h2>
          <p>
            Builders Ready is a multi-tenant client-portal platform for construction and
            renovation businesses. Each Tenant gets a branded experience for its team and its
            Clients, with features including project timelines, site-visit updates with
            photos, decision tracking, variation sign-off, invoice management, and messaging.
          </p>
          <p>
            We provide the platform; you provide the content and decide who you invite to it.
            The full current feature list is at <code>buildersready.uk</code>. We may add,
            remove or modify features over time; we&apos;ll give reasonable notice of material
            changes that materially affect how you use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">4. Your account</h2>
          <p>
            To use the Service you must create an account with accurate information and keep
            it up to date. You&apos;re responsible for keeping your password confidential and
            for all activity that happens under your account. You must be at least 18 years
            old and have authority to bind your business to these Terms.
          </p>
          <p>
            You agree not to share login credentials between people. Each Project Manager and
            each Client should have their own account, accessed via the invitation flow.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">5. Fees, trial and billing</h2>
          <p>
            The Service is offered on a 14-day free trial. Your payment card is collected at
            signup but you&apos;re not charged during the trial. At the end of the trial we
            automatically renew you onto the Subscription tier you selected at the price shown
            on our pricing page at the time you signed up.
          </p>
          <p>
            All prices are quoted exclusive of UK VAT. VAT is added at checkout where
            applicable. Subscription fees are non-refundable except where required by law, or
            in our reasonable discretion (for example, where we&apos;ve been unavailable for
            an extended period due to our fault).
          </p>
          <p>
            You can change tier, switch between monthly and annual billing, update payment
            method or cancel from Stripe&apos;s customer portal, accessible from your settings
            page. Cancellations take effect at the end of your current billing period; we
            don&apos;t prorate mid-period downgrades unless we choose to in our reasonable
            discretion.
          </p>
          <p>
            If your card is declined, we may attempt to recharge it within a reasonable
            window. If we&apos;re unable to collect payment, we may suspend your access until
            payment is received. If the account remains unpaid for more than 30 days, we may
            terminate it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">6. Project-count tier limits</h2>
          <p>
            Your Subscription includes a maximum number of active projects (the &quot;Project
            Limit&quot;). Active projects are those with status &quot;active&quot; or &quot;on
            hold&quot;. Completed and archived projects don&apos;t count toward the Limit.
          </p>
          <p>
            When you reach your Limit, the Service prevents creation of further active
            projects until you either archive a completed project or upgrade your tier.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">7. Your responsibilities</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              You&apos;re responsible for the accuracy and lawfulness of everything your
              Tenant uploads or generates — Client Data, project details, invoices, brand
              assets, bank details, communications.
            </li>
            <li>
              You must have a lawful basis to process the personal data of any individuals you
              invite or whose information you upload — Clients, Project Managers, or anyone
              else.
            </li>
            <li>
              You must not use the Service to upload unlawful, defamatory, infringing or
              harmful content; to send spam; to scrape data belonging to other Tenants; or to
              attempt to circumvent the platform&apos;s tenant isolation.
            </li>
            <li>
              You must not reverse-engineer, decompile or attempt to derive source code from
              the Service, except to the extent permitted by mandatory law.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">8. Data protection</h2>
          <p>
            For your own Tenant data and Client Data, you are the &quot;data controller&quot;
            and we are the &quot;data processor&quot;, as those terms are defined in UK GDPR.
            We process Client Data only on your documented instructions, which include your
            use of the Service in line with these Terms.
          </p>
          <p>
            Our handling of personal data is set out in our <a href="/privacy" className="text-primary underline">Privacy Policy</a>,
            which forms part of these Terms.
          </p>
          <p>
            We store data in the UK / EU. Where we use sub-processors (such as Supabase,
            Stripe, Resend and Vercel) we ensure appropriate safeguards are in place.
          </p>
          <p>
            If you require a separate Data Processing Agreement (DPA), email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>{' '}
            and we&apos;ll provide one based on the ICO&apos;s standard contractual clauses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">9. Intellectual property</h2>
          <p>
            We retain all rights, title and interest in the Service itself — the software,
            design, documentation, name and branding. We grant you a non-exclusive,
            non-transferable licence to use the Service in accordance with these Terms for the
            duration of your Subscription.
          </p>
          <p>
            You retain all rights to your Tenant data, Client Data, brand assets and any
            content you upload. By using the Service you grant us a limited licence to host,
            display and process that content as needed to provide the Service to you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">10. Service availability</h2>
          <p>
            We aim to keep the Service available 24/7 but don&apos;t guarantee uninterrupted
            access. We may perform scheduled maintenance, which we&apos;ll attempt to do
            outside UK business hours and notify you of where reasonably possible. We&apos;re
            not liable for downtime caused by third-party infrastructure providers (Supabase,
            Stripe, Resend, Vercel, Cloudflare, Apple, Google) or events outside our
            reasonable control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">11. Suspension and termination</h2>
          <p>
            You may cancel your Subscription any time from the customer portal. On
            cancellation, your access continues until the end of your current billing period;
            after that your Tenant becomes read-only for 7 days, then archived for a further
            30 days, then permanently deleted unless you re-subscribe or request data export.
          </p>
          <p>
            We may suspend or terminate your account immediately if we reasonably believe you
            have breached these Terms in a material way, used the Service to harm others, or
            failed to pay fees due. Where reasonable, we&apos;ll give notice and a chance to
            cure the breach first.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">12. Limitation of liability</h2>
          <p>
            Nothing in these Terms excludes or limits liability for: death or personal injury
            caused by our negligence; fraud or fraudulent misrepresentation; or anything else
            that can&apos;t be excluded or limited by UK law.
          </p>
          <p>
            Subject to the above: (a) we are not liable for indirect, special, consequential,
            or punitive damages, or for loss of profit, revenue, goodwill, business
            opportunity or anticipated savings; and (b) our total aggregate liability arising
            out of or in connection with the Service in any 12-month period is limited to the
            fees you paid us during the prior 12 months, or £1,000, whichever is the lower.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">13. Indemnity</h2>
          <p>
            You agree to indemnify us against any third-party claims, losses, damages or costs
            arising from: your Tenant&apos;s use of the Service in breach of these Terms;
            content you upload that infringes third-party rights; or your failure to comply
            with applicable law in relation to Client Data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">14. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. If we make material changes
            we&apos;ll notify active Tenants by email at least 14 days before they take
            effect. Continued use of the Service after the effective date constitutes
            acceptance. If you don&apos;t accept material changes, you may cancel before they
            take effect and any prepaid fees for the period after cancellation will be
            refunded on a prorated basis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">15. Governing law and jurisdiction</h2>
          <p>
            These Terms and any dispute arising out of or in connection with them are governed
            by the laws of England and Wales. The courts of England and Wales have exclusive
            jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">16. Contact</h2>
          <p>
            Questions about these Terms? Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
