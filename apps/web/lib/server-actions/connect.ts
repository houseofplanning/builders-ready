'use server';

import { getStripe, appUrl } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';
import { resolveCurrentTenant } from '@/lib/tenant-resolver';

export interface ConnectState {
  account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  onboarded_at: string | null;
}

export interface ConnectActionResult {
  ok: boolean;
  error?: string;
  url?: string;
  state?: ConnectState;
}

/** Read the tenant's current Connect status (for the settings UI). */
export async function getConnectState(): Promise<ConnectState | null> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from('tenants')
    .select(
      'stripe_connect_account_id, connect_charges_enabled, connect_payouts_enabled, connect_details_submitted, connect_onboarded_at',
    )
    .eq('id', tenant.tenant.id)
    .maybeSingle();
  if (!data) return null;
  return {
    account_id: data.stripe_connect_account_id,
    charges_enabled: data.connect_charges_enabled,
    payouts_enabled: data.connect_payouts_enabled,
    details_submitted: data.connect_details_submitted,
    onboarded_at: data.connect_onboarded_at,
  };
}

/**
 * Start (or resume) Stripe Connect onboarding for this tenant. Owner only.
 * Creates the Express connected account on first run, then returns a fresh
 * Account Link the owner is redirected to. Account Links are single-use and
 * short-lived, so we mint a new one each call.
 */
export async function startConnectOnboarding(opts?: {
  /** App path to return to after onboarding. Defaults to Billing settings. */
  returnTo?: string;
  /** App path Stripe sends the user to if the link expires. */
  refreshTo?: string;
}): Promise<ConnectActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner') {
    return { ok: false, error: 'Only the account owner can set up payments.' };
  }

  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  const tenantId = tenant.tenant.id;
  const slug = tenant.tenant.slug;

  const { data: t } = await admin
    .from('tenants')
    .select('stripe_connect_account_id, name, business_email')
    .eq('id', tenantId)
    .maybeSingle();
  if (!t) return { ok: false, error: 'Tenant not found.' };

  let accountId = t.stripe_connect_account_id as string | null;

  if (!accountId) {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: t.business_email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: t.name ?? undefined,
          // MCC 1520 — General Contractors (Residential & Commercial).
          mcc: '1520',
        },
        metadata: { tenant_id: tenantId },
      });
      accountId = account.id;
      const { error } = await admin
        .from('tenants')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', tenantId);
      if (error) return { ok: false, error: error.message };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Could not create the payments account.',
      };
    }
  }

  const refreshTo = opts?.refreshTo ?? `/${slug}/settings/billing?connect=refresh`;
  const returnTo = opts?.returnTo ?? `/${slug}/settings/billing?connect=return`;

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl()}${refreshTo}`,
      return_url: `${appUrl()}${returnTo}`,
      type: 'account_onboarding',
    });
    return { ok: true, url: link.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not start onboarding.',
    };
  }
}

/**
 * Pull the latest account status from Stripe and mirror the capability flags
 * onto the tenant. Called when the owner returns from onboarding (and safe to
 * call any time). The account.updated webhook keeps this fresh thereafter.
 */
export async function refreshConnectStatus(): Promise<ConnectActionResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner') {
    return { ok: false, error: 'Only the account owner can manage payments.' };
  }
  const admin = getSupabaseAdmin();
  const { data: t } = await admin
    .from('tenants')
    .select('stripe_connect_account_id, connect_onboarded_at')
    .eq('id', tenant.tenant.id)
    .maybeSingle();
  if (!t?.stripe_connect_account_id) {
    return { ok: false, error: 'No payments account yet.' };
  }

  try {
    const account = await getStripe().accounts.retrieve(
      t.stripe_connect_account_id,
    );
    const state: ConnectState = {
      account_id: account.id,
      charges_enabled: !!account.charges_enabled,
      payouts_enabled: !!account.payouts_enabled,
      details_submitted: !!account.details_submitted,
      onboarded_at:
        t.connect_onboarded_at ??
        (account.details_submitted ? new Date().toISOString() : null),
    };
    await admin
      .from('tenants')
      .update({
        connect_charges_enabled: state.charges_enabled,
        connect_payouts_enabled: state.payouts_enabled,
        connect_details_submitted: state.details_submitted,
        connect_onboarded_at: state.onboarded_at,
      })
      .eq('id', tenant.tenant.id);
    return { ok: true, state };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not refresh status.',
    };
  }
}
