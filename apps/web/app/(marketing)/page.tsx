import Link from 'next/link';

/**
 * Marketing landing page. Skeleton only — final design comes later.
 * Pricing block reflects the locked £29 / £69 / £149 tiers.
 */
export default function MarketingHome() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <nav className="mb-16 flex items-center">
        <div className="font-extrabold tracking-[0.2em] text-ink">
          BUILDERS <span className="text-primary">READY</span>
        </div>
        <div className="ml-auto flex gap-3">
          <Link
            href="/login"
            className="rounded-card border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Start free trial
          </Link>
        </div>
      </nav>

      <section className="text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Built for premium-residential builders
        </p>
        <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Give your clients a portal they&rsquo;ll{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            actually open.
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-sm text-ink-muted md:text-base">
          Stop chasing WhatsApp threads. Builders Ready gives your clients real-time visibility of
          their project — timeline, photos, decisions, invoices — in one branded mobile app.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-card bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            Start 14-day free trial
          </Link>
          <Link
            href="#pricing"
            className="rounded-card border border-hairline bg-white px-6 py-3 text-sm font-semibold text-ink"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          No setup fee · Cancel anytime · Card required
        </p>
      </section>

      <section id="pricing" className="mt-24">
        <h2 className="mb-2 text-center text-3xl font-extrabold">Simple pricing</h2>
        <p className="mb-10 text-center text-sm text-ink-muted">
          Everything&rsquo;s included at every tier. Price scales by active project count, not features.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'Starter', price: '£29', cap: 'up to 10 active projects' },
            { name: 'Pro', price: '£69', cap: 'up to 50 active projects' },
            { name: 'Unlimited', price: '£149', cap: 'unlimited active projects' },
          ].map((t) => (
            <div key={t.name} className="rounded-card border border-hairline bg-white p-6">
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-muted">
                {t.name}
              </div>
              <div className="mb-1 text-3xl font-extrabold text-ink">
                {t.price}
                <span className="text-base font-medium text-ink-muted"> / mo</span>
              </div>
              <p className="text-sm text-ink-muted">{t.cap}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-muted">
          All prices exclude VAT. Annual billing saves 20%.
        </p>
      </section>
    </main>
  );
}
