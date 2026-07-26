'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { tenantBranding, tenantBank, isValidSlug } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { getSupabaseAdmin } from '../supabase-admin';
import { resolveCurrentTenant } from '../tenant-resolver';

export interface ActionResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

// -------------------------------------------------------------------------
// uploadLogo — store a builder's logo in the public tenant-logos bucket and
// return its public URL. The branding form then saves that URL via
// saveBranding. Owner only.
// -------------------------------------------------------------------------
export async function uploadLogo(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose an image file.' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: 'Logo must be under 2 MB.' };
  }
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: 'Use a PNG, JPG, WebP or SVG file.' };
  }

  const resolved = await resolveCurrentTenant();
  if (!resolved) return { ok: false, error: 'Not signed in.' };
  if (resolved.role !== 'owner') {
    return { ok: false, error: 'Only the tenant owner can set the logo.' };
  }

  const ext =
    file.type === 'image/svg+xml'
      ? 'svg'
      : file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
  const path = `${resolved.tenant.id}/logo-${Date.now()}.${ext}`;
  const admin = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from('tenant-logos')
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) return { ok: false, error: `Upload failed: ${error.message}` };

  const { data } = admin.storage.from('tenant-logos').getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function saveBranding(
  raw: Record<string, unknown>,
): Promise<ActionResult> {
  const parsed = tenantBranding.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  if (!isValidSlug(parsed.data.slug)) {
    return { ok: false, error: 'This slug is reserved or invalid.' };
  }

  const resolved = await resolveCurrentTenant();
  if (!resolved) return { ok: false, error: 'Not signed in.' };
  if (resolved.role !== 'owner') {
    return { ok: false, error: 'Only the tenant owner can change branding.' };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('tenants')
    .update({
      slug: parsed.data.slug,
      logo_url: parsed.data.logo_url ?? null,
      brand_primary: parsed.data.brand_primary,
      brand_accent: parsed.data.brand_accent,
    })
    .eq('id', resolved.tenant.id);

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That slug is already taken — pick another.' };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/onboarding/branding');
  return { ok: true, redirectTo: '/onboarding/bank' };
}

export async function saveBankDetails(
  raw: Record<string, unknown>,
): Promise<ActionResult> {
  const parsed = tenantBank.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const resolved = await resolveCurrentTenant();
  if (!resolved) return { ok: false, error: 'Not signed in.' };
  if (resolved.role !== 'owner') {
    return { ok: false, error: 'Only the tenant owner can change bank details.' };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('tenants')
    .update({
      bank_name: parsed.data.bank_name,
      bank_account_name: parsed.data.bank_account_name,
      bank_sort_code: parsed.data.bank_sort_code,
      bank_account_number: parsed.data.bank_account_number,
      vat_number: parsed.data.vat_number,
      company_number: parsed.data.company_number,
    })
    .eq('id', resolved.tenant.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, redirectTo: '/onboarding/invite' };
}

export async function finishOnboarding(): Promise<void> {
  const resolved = await resolveCurrentTenant();
  if (!resolved) redirect('/login');
  redirect(`/${resolved.tenant.slug}/dashboard`);
}
