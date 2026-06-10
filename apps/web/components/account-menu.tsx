'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { TenantMemberRole } from '@br/shared';
import { signOutAction } from '@/lib/server-actions/auth';

const ROLE_LABEL: Record<TenantMemberRole, string> = {
  owner: 'Owner',
  pm: 'Project Manager',
  client: 'Client',
};

export function AccountMenu({
  slug,
  role,
  name,
  initials,
}: {
  slug: string;
  role: TenantMemberRole;
  name: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold tracking-wider text-white ring-offset-2 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ background: 'var(--br-primary)' }}
      >
        {initials || 'BR'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-card border border-hairline bg-white py-1 shadow-card"
        >
          <div className="border-b border-hairline px-4 py-3">
            <div className="truncate text-sm font-bold text-ink">{name}</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              {ROLE_LABEL[role]}
            </div>
          </div>

          {role === 'owner' && (
            <Link
              role="menuitem"
              href={`/${slug}/settings/billing`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
            >
              Billing &amp; plan
            </Link>
          )}

          <Link
            role="menuitem"
            href="/"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
          >
            View public site ↗
          </Link>

          <div className="my-1 border-t border-hairline" />

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-error hover:bg-canvas"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
