'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import {
  tenantSignup,
  normaliseSlug,
  TIERS,
  TRIAL_DAYS,
  type SubscriptionTier,
} from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { getSupabaseAdmin } from '../supabase-admin';

// -------------------------------------------------------------------------
// createTenantAndOwner
// -------------------------------------------------------------------------
// Form input includes a "full_name" field that the wireframe lacked — the
// profile.full_name will read better as a real name than the email prefix.
const signupSchema = tenantSignup.extend({
  full_name: z.string().min(2).max(120),
});

export interface SignupResult {
  ok: boolean;
  error?: string;
  slug?: string;
}

export async function createTenantAndOwner(
  raw: Record<string, unknown>,
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }
  const { full_name, business_name, email, password, tier } = parsed.data;

  const admin = getSupabaseAdmin();

  // 1. Admin-create the auth user with email auto-confirmed so we don't
  //    depend on email verification yet.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createErr || !created.user) {
    if (createErr?.message?.toLowerCase().includes('already')) {
      return { ok: false, error: 'An account with that email already exists.' };
    }
    return { ok: false, error: createErr?.message ?? 'Failed to create account.' };
  }
  const userId = created.user.id;

  // 2. Build a unique slug from the business name. Retry with -N suffixes
  //    on unique-constraint violations.
  const baseSlug = normaliseSlug(business_name) || 'tenant';
  let slug = baseSlug;
  let tenantId: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data: tenantRow, error: tenantErr } = await admin
      .from('tenants')
      .insert({
        slug: candidate,
        name: business_name,
        business_email: email,
        owner_user_id: userId,
        subscription_tier: tier as SubscriptionTier,
        subscription_status: 'trialing',
        trial_ends_at: new Date(
          Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .select('id, slug')
      .single();

    if (!tenantErr && tenantRow) {
      tenantId = tenantRow.id;
      slug = tenantRow.slug;
      break;
    }
    if (tenantErr?.code !== '23505') {
      // Not a uniqueness conflict — bail and roll back the auth user.
      await admin.auth.admin.deleteUser(userId);
      return {
        ok: false,
        error: tenantErr?.message ?? 'Failed to create tenant.',
      };
    }
  }
  if (!tenantId) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: 'Could not pick a unique slug. Try a different business name.' };
  }

  // 3. Insert the owner membership.
  const { error: memberErr } = await admin.from('tenant_members').insert({
    tenant_id: tenantId,
    user_id: userId,
    role: 'owner',
    joined_at: new Date().toISOString(),
  });
  if (memberErr) {
    await admin.from('tenants').delete().eq('id', tenantId);
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: memberErr.message };
  }

  // 4. Sign the user in via the cookie-based server client so the redirect
  //    target actually has a session.
  const supabase = await createSupabaseServer();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    return { ok: false, error: signInErr.message };
  }

  // 5. Sanity-check the tier limit table is in sync (typing).
  void TIERS;

  return { ok: true, slug };
}

// -------------------------------------------------------------------------
// signInAction
// -------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface SignInResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export async function signInAction(
  raw: Record<string, unknown>,
): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Enter your email and password.' };
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, error: 'Email or password is incorrect.' };
  }

  // Resolve tenant + redirect target
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, error: 'Session not set.' };
  }
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant:tenants(slug)')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const slug = (membership?.tenant as { slug?: string } | null)?.slug;
  return {
    ok: true,
    redirectTo: slug ? `/${slug}/dashboard` : '/onboarding/branding',
  };
}

// -------------------------------------------------------------------------
// signOutAction
// -------------------------------------------------------------------------
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
