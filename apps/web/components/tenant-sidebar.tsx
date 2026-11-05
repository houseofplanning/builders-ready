'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TenantMemberRole } from '@br/shared';
import { AccountMenu } from '@/components/account-menu';

/**
 * Desktop app sidebar for the tenant shell. Vertical nav with the brand mark
 * at the top, role-gated links with icons, and the account menu pinned to the
 * bottom. Hidden below lg — the mobile top bar carries the hamburger instead.
 */
export function TenantSidebar({
  slug,
  name,
  logoUrl,
  role,
  initials,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  role: TenantMemberRole;
  initials: string;
}) {
  const pathname = usePathname();
  const isTrade = role === 'owner' || role === 'pm';

  const items: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: `/${slug}/dashboard`, label: 'Dashboard', icon: <IconGrid /> },
    ...(isTrade
      ? [
          { href: `/${slug}/find-work`, label: 'Marketplace', icon: <IconBag /> },
          { href: `/${slug}/planning-radar`, label: 'Planning Radar', icon: <IconRadar /> },
          { href: `/${slug}/messages`, label: 'Messages', icon: <IconChat /> },
        ]
      : []),
    { href: `/${slug}/projects`, label: 'Projects', icon: <IconLayers /> },
    ...(isTrade
      ? [
          { href: `/${slug}/project-schedule`, label: 'Project Schedule', icon: <IconLayers /> },
          { href: `/${slug}/schedule`, label: 'Schedule', icon: <IconGrid /> },
          { href: `/${slug}/estimates`, label: 'Quotes', icon: <IconDoc /> },
          { href: `/${slug}/workforce`, label: 'Team & rates', icon: <IconPeople /> },
          { href: `/${slug}/team`, label: 'Members', icon: <IconPeople /> },
        ]
      : []),
  ];

  const roleLabel = role === 'owner' ? 'Owner' : role === 'pm' ? 'Project Manager' : 'Client';

  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col border-r border-hairline bg-white px-3 py-5 lg:flex">
      {/* Brand */}
      <Link href={`/${slug}/dashboard`} className="mb-6 flex items-center gap-2.5 px-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={name} className="h-8 w-auto max-w-[170px] object-contain object-left" />
        ) : (
          <>
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-extrabold tracking-wider text-white"
              style={{ background: 'var(--br-primary)' }}
            >
              {initials || 'BR'}
            </div>
            <span className="truncate text-sm font-extrabold tracking-wide text-ink">{name}</span>
          </>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map((it) => {
          const active =
            it.href === `/${slug}/dashboard`
              ? pathname === it.href
              : pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'bg-tenant-primary-soft text-tenant-primary'
                  : 'text-ink-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <span className="flex-shrink-0" style={active ? undefined : { color: '#9AA7A2' }}>
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <div className="mt-auto flex items-center gap-3 border-t border-hairline px-1 pt-3">
        <AccountMenu slug={slug} role={role} name={name} initials={initials} placement="top-left" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{name}</div>
          <div className="text-[10px] uppercase tracking-widest text-ink-muted">{roleLabel}</div>
        </div>
      </div>
    </aside>
  );
}

/* ---------- icons (18px, stroke) ---------- */
const sp = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function IconGrid() {
  return (
    <svg {...sp}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg {...sp}>
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg {...sp}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg {...sp}>
      <path d="M21 11.5a8.4 8.4 0 0 1-12.9 7.5L3 21l1.9-4.5A8.4 8.4 0 1 1 21 11.5Z" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg {...sp}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg {...sp}>
      <path d="M8 3h6l4 4v14H6V3h2Z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}
function IconPeople() {
  return (
    <svg {...sp}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 7.5a3 3 0 0 1 0 5.5" />
      <path d="M17 20a5.5 5.5 0 0 0-3-5" />
    </svg>
  );
}
