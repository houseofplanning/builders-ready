import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { buildTenantPalette, paletteToCssVars } from '@br/shared';
import { TenantSidebar } from '@/components/tenant-sidebar';
import { MobileMenu } from '@/components/mobile-menu';
import { AccountMenu } from '@/components/account-menu';
import { StripeSetupBanner } from '@/components/stripe-setup-banner';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Tenant route group layout. Guards on auth + slug match, applies the tenant's
 * brand colours as CSS variables, and frames every tenant page in the app
 * shell: a left sidebar on desktop, a compact top bar with a hamburger on
 * mobile.
 */
export default async function TenantLayout({ children, params }: Props) {
  const { slug } = await params;
  // Layout stays reachable even when the subscription has lapsed — the
  // individual pages enforce the gate, and the billing page must render.
  const { tenant, role } = await requireTenantBySlug(slug, { allowInactive: true });

  const palette = buildTenantPalette({
    primary: tenant.brand_primary,
    accent: tenant.brand_accent,
  });
  const cssVars = paletteToCssVars(palette) as React.CSSProperties;

  const initials =
    tenant.name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BR';

  const showStripeBanner =
    (role === 'owner' || role === 'pm') && !tenant.connect_charges_enabled;

  return (
    <div style={cssVars} className="min-h-screen bg-canvas">
      <div className="flex">
        <TenantSidebar
          slug={tenant.slug}
          name={tenant.name}
          logoUrl={tenant.logo_url ?? null}
          role={role}
          initials={initials}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Mobile top bar — hidden on lg where the sidebar takes over */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-white px-4 py-3 lg:hidden">
            <Link href={`/${tenant.slug}/dashboard`} className="flex min-w-0 items-center gap-2.5">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-8 w-auto max-w-[160px] object-contain object-left"
                />
              ) : (
                <>
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-extrabold tracking-wider text-white"
                    style={{ background: 'var(--br-primary)' }}
                  >
                    {initials}
                  </div>
                  <span className="truncate text-sm font-bold tracking-wide">{tenant.name}</span>
                </>
              )}
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <MobileMenu slug={tenant.slug} role={role} />
              <AccountMenu slug={tenant.slug} role={role} name={tenant.name} initials={initials} />
            </div>
          </header>

          {showStripeBanner && (
            <StripeSetupBanner slug={tenant.slug} tenantId={tenant.id} />
          )}

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
