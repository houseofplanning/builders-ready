import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · Builders Ready',
  description:
    'How Builders Ready collects, uses and protects personal data — written for UK GDPR.',
};

const LAST_UPDATED = '18 May 2026';
const COMPANY = 'Mehraj Consultancy Ltd';
const COMPANIES_HOUSE = '14161216';
// Registered office is not displayed publicly — see Companies House register.
// Replace with a virtual-office address once one is in place.
const CONTACT_EMAIL = 'info@buildersready.uk';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <div className="text-xs font-bold uppercase tracking-widest text-ink-muted">
          BUILDERS READY
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>
      </header>

      <article className="prose-content space-y-6 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="text-xl font-extrabold">1. Who we are</h2>
          <p>
            Builders Ready is operated by <strong>{COMPANY}</strong> (&quot;we&quot;,
            &quot;us&quot;, &quot;our&quot;), a company registered in England and Wales with
            company number {COMPANIES_HOUSE}. Our registered office details are on file with
            Companies House.
          </p>
          <p>
            For the purposes of UK GDPR, we are the <strong>data controller</strong> of:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Personal data about builder account holders (the people who sign up for a Tenant)</li>
            <li>Personal data about Project Managers and Clients invited to a Tenant</li>
            <li>Operational data about how the Service is used</li>
          </ul>
          <p>
            For data uploaded into a Tenant by its builder (photos, project notes,
            client-specific information beyond the basic profile) we act as a{' '}
            <strong>data processor</strong> on the builder&apos;s behalf. The builder is the
            controller of that Client Data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">2. Data we collect</h2>
          <h3 className="mt-3 font-bold">From builders</h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>Name, email address, password (hashed)</li>
            <li>Business name, business email, business phone</li>
            <li>Brand assets: logo, colour preferences</li>
            <li>Banking details for invoicing (sort code, account number, account name) — used only to display on invoices to your clients; we never debit these</li>
            <li>VAT and Companies House registration numbers, where provided</li>
            <li>Payment method information (handled by Stripe — we never see card numbers)</li>
            <li>Profile photo (optional)</li>
          </ul>
          <h3 className="mt-3 font-bold">From Project Managers and Clients invited to a Tenant</h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>Name, email address, password (hashed)</li>
            <li>Phone number (optional)</li>
            <li>Profile photo (optional)</li>
            <li>Activity on the Service: messages, updates, decisions, signatures, payments marked</li>
          </ul>
          <h3 className="mt-3 font-bold">Automatically</h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>IP address, browser type, device type, mobile push tokens (when relevant)</li>
            <li>Login timestamps and approximate geographic location</li>
            <li>Crash reports and error logs (via Sentry)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">3. How we use it</h2>
          <p>We use personal data to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Provide and operate the Service</li>
            <li>Authenticate you and keep your account secure</li>
            <li>Send transactional emails (welcome, invitations, billing receipts, password resets)</li>
            <li>Bill your subscription via Stripe</li>
            <li>Send notifications about events on your projects (push and email)</li>
            <li>Diagnose technical issues and improve the Service</li>
            <li>Comply with legal obligations (tax records, fraud prevention)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">4. Lawful basis for processing (UK GDPR)</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Contract:</strong> processing necessary to provide the Service to you
              under the Terms and Conditions you accepted.
            </li>
            <li>
              <strong>Legitimate interest:</strong> security, fraud prevention, product
              improvement, and operational diagnostics. We&apos;ve balanced these interests
              against your rights and freedoms.
            </li>
            <li>
              <strong>Legal obligation:</strong> tax records, response to lawful regulator
              requests.
            </li>
            <li>
              <strong>Consent:</strong> where you explicitly opt in (for example, biometric
              unlock on your phone). You can withdraw consent any time.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">5. Who we share data with</h2>
          <p>
            We don&apos;t sell your data. We share it only with the following sub-processors,
            which are bound by data protection agreements:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-hairline text-xs">
              <thead className="bg-canvas">
                <tr>
                  <th className="border border-hairline p-2 text-left">Sub-processor</th>
                  <th className="border border-hairline p-2 text-left">Purpose</th>
                  <th className="border border-hairline p-2 text-left">Location</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-hairline p-2">Supabase</td>
                  <td className="border border-hairline p-2">Database, authentication, file storage</td>
                  <td className="border border-hairline p-2">London (eu-west-2)</td>
                </tr>
                <tr>
                  <td className="border border-hairline p-2">Stripe</td>
                  <td className="border border-hairline p-2">Subscription billing, payment processing</td>
                  <td className="border border-hairline p-2">EU + US (adequate safeguards)</td>
                </tr>
                <tr>
                  <td className="border border-hairline p-2">Resend</td>
                  <td className="border border-hairline p-2">Transactional email delivery</td>
                  <td className="border border-hairline p-2">EU (Ireland)</td>
                </tr>
                <tr>
                  <td className="border border-hairline p-2">Vercel</td>
                  <td className="border border-hairline p-2">Web hosting and edge delivery</td>
                  <td className="border border-hairline p-2">US-headquartered, EU edge</td>
                </tr>
                <tr>
                  <td className="border border-hairline p-2">Cloudflare</td>
                  <td className="border border-hairline p-2">DNS, email routing</td>
                  <td className="border border-hairline p-2">Global; UK/EU PoPs prioritised</td>
                </tr>
                <tr>
                  <td className="border border-hairline p-2">Expo (push)</td>
                  <td className="border border-hairline p-2">Mobile push notification delivery</td>
                  <td className="border border-hairline p-2">US</td>
                </tr>
                <tr>
                  <td className="border border-hairline p-2">Apple / Google</td>
                  <td className="border border-hairline p-2">App Store distribution, push transport</td>
                  <td className="border border-hairline p-2">Global</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Where data is transferred outside the UK / EU, we rely on the UK&apos;s
            International Data Transfer Agreement, Standard Contractual Clauses, or adequacy
            decisions, as appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">6. How we keep data safe</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Database isolation:</strong> Each Tenant&apos;s data is gated by
              Postgres row-level-security policies; users in one Tenant cannot read or write
              data belonging to another.
            </li>
            <li>
              <strong>Encryption in transit:</strong> All traffic is HTTPS / TLS 1.2+.
            </li>
            <li>
              <strong>Encryption at rest:</strong> Supabase encrypts the database; storage
              buckets are private with signed-URL access.
            </li>
            <li>
              <strong>Passwords:</strong> hashed using bcrypt by Supabase Auth. We never store
              or see plaintext passwords.
            </li>
            <li>
              <strong>Payment details:</strong> handled entirely by Stripe — we never receive
              card numbers, CVCs or full bank account details for incoming card payments.
            </li>
            <li>
              <strong>Backups:</strong> Supabase performs daily automated backups, retained
              for 7 days (free) or 14+ days (paid tier).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">7. How long we keep data</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Account data: while your Tenant is active, plus 30 days after cancellation</li>
            <li>Backups: rolling 7-30 day window depending on plan</li>
            <li>Invoicing records: 6 years after the end of the financial year (HMRC requirement)</li>
            <li>Crash logs: 30 days</li>
            <li>Marketing emails: until you unsubscribe, then suppression record retained indefinitely so we don&apos;t accidentally re-contact you</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">8. Your rights under UK GDPR</h2>
          <p>You have the right to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Access the personal data we hold about you</li>
            <li>Rectify inaccurate or incomplete data</li>
            <li>Erase your data (subject to legal retention obligations like HMRC)</li>
            <li>Restrict or object to processing</li>
            <li>Data portability — receive your data in a machine-readable format</li>
            <li>Withdraw consent where processing relies on consent</li>
            <li>Complain to the UK Information Commissioner&apos;s Office (ICO) at{' '}
              <a href="https://ico.org.uk" className="text-primary underline">ico.org.uk</a>
            </li>
          </ul>
          <p>
            To exercise any of these, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>
            . We&apos;ll respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">9. Cookies</h2>
          <p>
            We use a minimal set of strictly-necessary cookies for authentication (so we know
            who you are after you sign in). We don&apos;t use third-party advertising cookies
            or tracking pixels. Stripe sets cookies when you interact with Checkout — those
            are governed by Stripe&apos;s own privacy policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">10. Children</h2>
          <p>
            Builders Ready isn&apos;t directed at children. We don&apos;t knowingly collect
            personal data from anyone under 18. If we become aware that we have, we&apos;ll
            delete it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">11. Changes to this policy</h2>
          <p>
            We may update this policy from time to time to reflect changes in our practices or
            legal requirements. The &quot;Last updated&quot; date at the top of this page
            shows when. Material changes will be flagged by email to active Tenants.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">12. Contact us</h2>
          <p>
            Questions about this policy or your data?
          </p>
          <p>
            <strong>{COMPANY}</strong> (Companies House {COMPANIES_HOUSE})
            <br />
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
