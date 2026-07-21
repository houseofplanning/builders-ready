import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link
              href="/"
              className="font-extrabold tracking-[0.2em] text-ink"
            >
              BUILDERS <span className="text-primary">READY</span>
            </Link>
            <p className="mt-3 text-xs text-ink-muted">
              The client portal UK builders use — from sole traders to
              multi-PM firms — to look professional, protect margin, and end
              disputes about who agreed to what.
            </p>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Product
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <FooterLink href="/features" label="Features" />
              <FooterLink href="/pricing" label="Pricing" />
              <FooterLink href="/signup" label="Start free trial" />
              <FooterLink href="/login" label="Sign in" />
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Company
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <FooterLink href="/about" label="About" />
              <FooterLink href="/blog" label="Blog" />
              <FooterLink href="/terms" label="Terms" />
              <FooterLink href="/privacy" label="Privacy" />
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Get in touch
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="mailto:info@buildersready.uk"
                  className="text-ink-muted hover:text-ink"
                >
                  info@buildersready.uk
                </a>
              </li>
              <li className="text-xs text-ink-muted">
                UK GDPR compliant. Data residency in the UK and EU.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-hairline pt-6 text-xs text-ink-muted md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Builders Ready. All rights reserved.</p>
          <p>Built in the UK.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="text-ink-muted hover:text-ink">
        {label}
      </Link>
    </li>
  );
}
