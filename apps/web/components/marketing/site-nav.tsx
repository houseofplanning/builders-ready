'use client';

import Link from 'next/link';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/planning-radar', label: 'Planning Radar' },
  { href: '/subcontractors', label: 'Subcontractors' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/homeowners', label: 'For homeowners' },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-hairline-warm bg-paper/80 backdrop-blur">
      <div className="flex items-center gap-3 px-6 py-4 sm:px-10 xl:px-14">
        <Link
          href="/"
          className="whitespace-nowrap text-sm font-extrabold tracking-[0.18em] text-ink-warm sm:text-base sm:tracking-[0.2em]"
          onClick={() => setOpen(false)}
        >
          BUILDERS <span className="text-primary">READY</span>
        </Link>

        {/* Desktop links */}
        <nav className="ml-9 hidden gap-7 text-sm font-semibold text-ink-muted-warm lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap transition-colors hover:text-ink-warm"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-warm transition-colors hover:text-primary lg:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-deep"
          >
            Start free
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-warm lg:hidden"
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
        <nav className="border-t border-hairline-warm bg-paper lg:hidden">
          <div className="px-6 py-2 sm:px-10 xl:px-14">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block border-b border-hairline-warm/70 py-3.5 text-base font-bold text-ink-warm last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block py-3.5 text-base font-bold text-primary"
            >
              Log in →
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
