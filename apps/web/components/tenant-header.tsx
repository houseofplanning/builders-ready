import Link from 'next/link';
import type { Tenant, TenantMemberRole } from '@br/shared';
import { AccountMenu } from '@/components/account-menu';
import { MobileMenu } from '@/components/mobile-menu';

export function TenantHeader({
  tenant,
  role,
}: {
  tenant: Tenant;
  role: TenantMemberRole;
}) {
  const initials = tenant.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="relative border-b border-hairline bg-white">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6 lg:gap-6 lg:px-10">
        <Link href={`/${tenant.slug}/dashboard`} className="flex min-w-0 items-center gap-3">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-10 w-auto max-w-[200px] flex-shrink-0 object-contain object-left"
            />
          ) : (
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-sm font-extrabold tracking-widest text-white"
              style={{ background: 'var(--br-primary)' }}
            >
              {initials || 'BR'}
            </div>
          )}
          <div className="min-w-0">
            {!tenant.logo_url && (
              <div className="truncate text-sm font-bold tracking-wide">{tenant.name}</div>
            )}
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              {role === 'owner' ? 'Owner' : role === 'pm' ? 'Project Manager' : 'Client'}
            </div>
          </div>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex lg:ml-6">
          <NavItem href={`/${tenant.slug}/dashboard`}>Dashboard</NavItem>
          {(role === 'owner' || role === 'pm') && (
            <NavItem href={`/${tenant.slug}/find-work`}>Marketplace</NavItem>
          )}
          {(role === 'owner' || role === 'pm') && (
            <NavItem href={`/${tenant.slug}/messages`}>Messages</NavItem>
          )}
          <NavItem href={`/${tenant.slug}/projects`}>Projects</NavItem>
          {(role === 'owner' || role === 'pm') && (
            <NavItem href={`/${tenant.slug}/estimates`}>Quotes</NavItem>
          )}
          {(role === 'owner' || role === 'pm') && (
            <NavItem href={`/${tenant.slug}/team`}>Team</NavItem>
          )}
        </nav>

        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <MobileMenu slug={tenant.slug} role={role} />
          <AccountMenu
            slug={tenant.slug}
            role={role}
            name={tenant.name}
            initials={initials}
          />
        </div>
      </div>
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-semibold text-ink-muted transition hover:bg-canvas hover:text-ink"
    >
      {children}
    </Link>
  );
}
