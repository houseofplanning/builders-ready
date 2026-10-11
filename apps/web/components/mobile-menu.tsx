'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TenantMemberRole } from '@br/shared';

/**
 * Mobile navigation for the tenant header. On small screens the inline nav is
 * hidden and this hamburger opens a full-width dropdown of the same links.
 * Hidden on md+ where the inline nav is shown instead.
 */
export function MobileMenu({ slug, role }: { slug: string; role: TenantMemberRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isTrade = role === 'owner' || role === 'pm';
  const links: { href: string; label: string }[] = [
    { href: `/${slug}/dashboard`, label: 'Dashboard' },
    ...(isTrade
      ? [
          { href: `/${slug}/find-work`, label: 'Marketplace' },
          { href: `/${slug}/messages`, label: 'Messages' },
        ]
      : []),
    { href: `/${slug}/projects`, label: 'Projects' },
    ...(isTrade
      ? [
          { href: `/${slug}/estimates`, label: 'Quotes' },
          { href: `/${slug}/team`, label: 'Team' },
        ]
      : []),
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-ink"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[57px] z-40 bg-ink/20"
          />
          <nav className="absolute left-0 right-0 top-full z-50 border-b border-hairline bg-white shadow-card">
            <ul className="px-2 py-2">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`block rounded-lg px-4 py-3 text-sm font-semibold ${
                        active ? 'bg-canvas text-ink' : 'text-ink-muted hover:bg-canvas hover:text-ink'
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
