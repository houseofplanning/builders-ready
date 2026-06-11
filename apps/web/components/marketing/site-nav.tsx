import Link from 'next/link';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
        <Link href="/" className="font-extrabold tracking-[0.2em] text-ink">
          BUILDERS <span className="text-primary">READY</span>
        </Link>
        <nav className="ml-10 hidden gap-7 text-sm font-semibold text-ink-muted md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg border border-hairline bg-white px-3 py-2 text-xs font-semibold text-ink md:text-sm"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white md:text-sm"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
