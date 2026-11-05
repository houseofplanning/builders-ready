import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline-warm bg-paper-alt">
      <div className="px-6 py-16 sm:px-10 xl:px-14">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          {/* Brand — left */}
          <div className="md:max-w-xs">
            <Link href="/" className="font-extrabold tracking-[0.2em] text-ink-warm">
              BUILDERS <span className="text-primary">READY</span>
            </Link>
            <p className="mt-3 max-w-[24em] text-xs text-ink-muted-warm">
              The whole job, from the first lead to the final invoice, in one app built for UK
              trades.
            </p>
          </div>

          {/* Nav columns — grouped on the right */}
          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16 lg:gap-24">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted-warm">
                Product
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <FooterLink href="/planning-radar" label="Planning Radar" />
                <FooterLink href="/subcontractors" label="Subcontractors" />
                <FooterLink href="/features" label="Features" />
                <FooterLink href="/pricing" label="Pricing" />
                <FooterLink href="/homeowners" label="For homeowners" />
                <FooterLink href="/signup" label="Start free trial" />
                <FooterLink href="/login" label="Sign in" />
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted-warm">
                Company
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <FooterLink href="/about" label="About" />
                <FooterLink href="/blog" label="Blog" />
                <li>
                  <a
                    href="https://www.tiktok.com/@BuildersReadyUK"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-muted-warm hover:text-ink-warm"
                  >
                    TikTok
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@buildersready.uk"
                    className="text-ink-muted-warm hover:text-ink-warm"
                  >
                    info@buildersready.uk
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted-warm">
                Legal
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <FooterLink href="/privacy" label="Privacy" />
                <FooterLink href="/terms" label="Terms" />
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-hairline-warm pt-6 text-xs leading-relaxed text-ink-muted-warm">
          <p>
            Builders Ready Ltd, registered in England &amp; Wales. Company no. 17551960.
            Registered office: 66 Paul Street, London, England, EC2A 4NA.
          </p>
          <p className="mt-1">
            © {new Date().getFullYear()} Builders Ready Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="text-ink-muted-warm hover:text-ink-warm">
        {label}
      </Link>
    </li>
  );
}
