import Image from 'next/image';
import Link from 'next/link';
import type { Tenant, TenantMemberRole } from '@br/shared';
import { signOutAction } from '@/lib/server-actions/auth';

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
    <header className="border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href={`/${tenant.slug}/dashboard`} className="flex items-center gap-3">
          {tenant.logo_url ? (
            <Image
              src={tenant.logo_url}
              alt={tenant.name}
              width={36}
              height={36}
              className="rounded-md object-contain"
              unoptimized
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-extrabold tracking-widest text-white"
              style={{ background: 'var(--br-primary)' }}
            >
              {initials || 'BR'}
            </div>
          )}
          <div>
            <div className="text-sm font-bold tracking-wide">{tenant.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              {role === 'owner' ? 'Owner' : role === 'pm' ? 'Project Manager' : 'Client'}
            </div>
          </div>
        </Link>

        <nav className="ml-6 flex items-center gap-1 text-sm">
          <NavItem href={`/${tenant.slug}/dashboard`}>Dashboard</NavItem>
          <NavItem href={`/${tenant.slug}/projects`}>Projects</NavItem>
          {(role === 'owner' || role === 'pm') && (
            <NavItem href={`/${tenant.slug}/team`}>Team</NavItem>
          )}
        </nav>

        <form action={signOutAction} className="ml-auto">
          <button
            type="submit"
            className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas"
          >
            Sign out
          </button>
        </form>
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
