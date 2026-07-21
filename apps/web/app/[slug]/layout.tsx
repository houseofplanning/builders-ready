import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { buildTenantPalette, paletteToCssVars } from '@br/shared';
import { TenantHeader } from '@/components/tenant-header';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Tenant route group layout. Guards on auth + slug match, applies the
 * tenant's brand colours as CSS variables on the wrapping <div>.
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

  return (
    <div style={cssVars} className="min-h-screen bg-canvas">
      <TenantHeader tenant={tenant} role={role} />
      <main className="mx-auto w-full max-w-[1600px] px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
