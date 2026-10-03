'use client';

import Link from 'next/link';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3.5 sm:px-6">
        <Link
          href="/"
          className="whitespace-nowrap text-sm font-extrabold tracking-[0.18em] text-ink sm:text-base sm:tracking-[0.2em]"
          onClick={() => setOpen(false)}
        >
          BUILDERS <span className="text-primary">READY</span>
        </Link>

        {/* Desktop links */}
        <nav className="ml-8 hidden gap-7 text-sm font-semibold text-ink-muted md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white sm:text-sm"
          >
            Start free
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink md:hidden"
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="border-t border-hairline bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-5 py-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block border-b border-hairline/70 py-3 text-sm font-semibold text-ink last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-semibold text-primary"
            >
              Sign in →
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
