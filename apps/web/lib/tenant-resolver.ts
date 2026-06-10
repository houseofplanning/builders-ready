import 'server-only';
import { redirect } from 'next/navigation';
import type { Tenant, TenantMemberRole } from '@br/shared';
import { createSupabaseServer } from './supabase-server';

/**
 * Tenant-resolution helpers used by Server Components and Server Actions.
 * They return either typed data, a redirect, or a thrown error.
 */

export interface ResolvedTenant {
  tenant: Tenant;
  role: TenantMemberRole;
  user_id: string;
}

/**
 * Resolve the calling user's tenant from `tenant_members` + `tenants`.
 * Returns null if not logged in or has no membership.
 */
export async function resolveCurrentTenant(): Promise<ResolvedTenant | null> {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('tenant_members')
    .select('role, tenant:tenants(*)')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error || !data || !data.tenant) return null;

  return {
    tenant: data.tenant as unknown as Tenant,
    role: data.role as TenantMemberRole,
    user_id: auth.user.id,
  };
}

/**
 * True when a tenant may use the app: an active subscription, or a trial
 * that hasn't expired yet. Everything else — an expired trial, past_due,
 * cancelled, suspended or inactive — is locked out until they pay.
 */
export function isTenantInGoodStanding(tenant: Tenant): boolean {
  const status = tenant.subscription_status;
  if (status === 'active') return true;
  if (status === 'trialing') {
    if (!tenant.trial_ends_at) return true; // open-ended trial
    return new Date(tenant.trial_ends_at).getTime() > Date.now();
  }
  return false;
}

/**
 * Server-Component guard: ensure the user is signed in and a member of the
 * tenant whose slug appears in the URL. Redirects on mismatch / no auth.
 *
 * Also enforces the subscription gate: a tenant whose trial has expired or
 * whose subscription has lapsed is redirected to the billing page until they
 * pay. Pass { allowInactive: true } on the pages that must stay reachable
 * while locked out — the tenant layout and the billing page itself —
 * otherwise the redirect would loop.
 */
export async function requireTenantBySlug(
  slug: string,
  opts: { allowInactive?: boolean } = {},
): Promise<ResolvedTenant> {
  const resolved = await resolveCurrentTenant();
  if (!resolved) redirect('/login');
  if (resolved.tenant.slug !== slug) {
    // User exists but is logged into a different tenant — send them home.
    redirect(`/${resolved.tenant.slug}/dashboard`);
  }
  if (!opts.allowInactive && !isTenantInGoodStanding(resolved.tenant)) {
    redirect(`/${slug}/settings/billing`);
  }
  return resolved;
}

/**
 * Server-Component guard: ensure the user is signed in (any tenant). Used
 * by /onboarding/* pages where the user has a tenant but hasn't fully
 * configured it.
 */
export async function requireAuth(): Promise<ResolvedTenant> {
  const resolved = await resolveCurrentTenant();
  if (!resolved) redirect('/login');
  return resolved;
}
