import Image from 'next/image';
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
      <div className="mx-auto flex max-w-6xl items-center px-6 py-3">
        <div className="flex items-center gap-3">
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
        </div>
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
