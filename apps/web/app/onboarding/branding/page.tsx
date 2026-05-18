import { requireAuth } from '@/lib/tenant-resolver';
import { BrandingForm } from './branding-form';

export default async function BrandingStep() {
  const { tenant } = await requireAuth();
  return (
    <section className="rounded-card border border-hairline bg-white p-7 shadow-card">
      <h1 className="text-lg font-extrabold">Make it yours</h1>
      <p className="mt-1 text-xs text-ink-muted">
        Your clients will see this branding in the mobile app and on every invoice. You can change
        it any time from Settings.
      </p>
      <BrandingForm
        initial={{
          slug: tenant.slug,
          logo_url: tenant.logo_url ?? null,
          brand_primary: tenant.brand_primary,
          brand_accent: tenant.brand_accent,
          name: tenant.name,
        }}
      />
    </section>
  );
}
