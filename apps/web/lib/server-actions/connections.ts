'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';
import { sendConnectionInviteEmail } from '../email';

export interface ConnectionResult {
  ok: boolean;
  error?: string;
  token?: string;
  slug?: string;
}

async function ownerOrPm() {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { error: 'Not signed in.' as const };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { error: 'Only owners and PMs can manage the team.' as const };
  }
  return { tenant };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Invite a contact-only resource to connect (Door A). Emails them a link that,
 * once they sign in / sign up, links their login to this resource so they can
 * see their jobs and respond. Owner/PM only; never for plant.
 */
export async function inviteResourceToConnect(input: {
  resource_id: string;
  email: string;
}): Promise<ConnectionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Enter a valid email to send the invite to.' };
  }

  const supabase = await createSupabaseServer();
  const { data: res } = await supabase
    .from('resources')
    .select('id, kind, display_name, connection_status, tenant_id')
    .eq('id', input.resource_id)
    .single();
  if (!res || (res as { tenant_id: string }).tenant_id !== tenant.tenant.id) {
    return { ok: false, error: 'That person could not be found on your team.' };
  }
  if ((res as { kind: string }).kind === 'plant') {
    return { ok: false, error: 'Plant and equipment cannot be invited to connect.' };
  }
  if ((res as { connection_status: string }).connection_status === 'connected') {
    return { ok: false, error: 'They are already connected.' };
  }

  // Only one pending invite per resource — expire any earlier one first.
  await supabase
    .from('resource_invites')
    .update({ status: 'expired', responded_at: new Date().toISOString() })
    .eq('resource_id', res.id)
    .eq('status', 'pending');

  const { data: inv, error } = await supabase
    .from('resource_invites')
    .insert({
      tenant_id: tenant.tenant.id,
      resource_id: res.id,
      channel: 'email',
      sent_to: email,
      invited_by: tenant.user_id,
    })
    .select('token')
    .single();
  if (error) return { ok: false, error: error.message };
  const token = (inv as { token: string }).token;

  await supabase
    .from('resources')
    .update({ connection_status: 'invited', email, updated_at: new Date().toISOString() })
    .eq('id', res.id);

  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', tenant.user_id)
    .maybeSingle();

  try {
    await sendConnectionInviteEmail({
      to: email,
      tenantName: tenant.tenant.name,
      inviterName: (prof?.full_name as string | undefined) || tenant.tenant.name,
      resourceName: (res as { display_name: string }).display_name,
      token,
    });
  } catch (e) {
    // The email didn't go out — roll back so we don't leave a phantom pending
    // invite and an "invited" badge the person never actually received.
    await supabase
      .from('resource_invites')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('resource_id', res.id)
      .eq('status', 'pending');
    await supabase
      .from('resources')
      .update({ connection_status: 'contact_only', updated_at: new Date().toISOString() })
      .eq('id', res.id);
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not send the invite email.',
    };
  }

  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  return { ok: true, token };
}

/**
 * Accept a connection invite. Must be signed in (sign up / sign in happens on
 * the /connect page first). Links the caller's login to the invited resource.
 */
export async function acceptConnectionInvite(token: string): Promise<ConnectionResult> {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, error: 'Please sign in or create an account first.' };
  }
  const { data, error } = await supabase.rpc('accept_resource_invite', {
    p_token: token,
  });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, slug: (row as { tenant_slug?: string } | null)?.tenant_slug };
}

/** Remove a connection — reverts the resource to a contact-only record. Owner/PM only. */
export async function disconnectResource(resourceId: string): Promise<ConnectionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('resources')
    .update({ user_id: null, connection_status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('id', resourceId)
    .eq('tenant_id', tenant.tenant.id);
  if (error) return { ok: false, error: error.message };
  await supabase
    .from('resource_invites')
    .update({ status: 'expired', responded_at: new Date().toISOString() })
    .eq('resource_id', resourceId)
    .eq('status', 'pending');
  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Directory (Door D): browse discoverable tradespeople and hire one direct.
// ---------------------------------------------------------------------------
export interface DirectoryTradesperson {
  tenant_id: string;
  name: string;
  logo_url: string | null;
  business_phone: string | null;
  business_email: string | null;
  day_rate_pence: number | null;
  day_rate_unit: string | null;
  trades: string[];
  service_area: string | null;
  rating: number | null;
  review_count: number;
}

/** Search the directory of available tradespeople (owner/PM only). */
export async function searchTradespeople(
  trade: string | null,
  area: string | null,
): Promise<{ ok: boolean; error?: string; rows?: DirectoryTradesperson[] }> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc('search_tradespeople', {
    p_trade: trade || null,
    p_area: area || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []) as DirectoryTradesperson[] };
}

/**
 * Hire a tradesperson from the directory: create a connected subcontractor
 * resource in my tenant linked to their tenant (marketplace_tenant_id). The
 * advertised rate seeds my private rate, which I can change in Team & rates.
 * Idempotent per tradesperson. Owner/PM only.
 */
export async function hireFromDirectory(input: {
  marketplace_tenant_id: string;
  display_name: string;
  trade: string | null;
  day_rate_pence: number | null;
  day_rate_unit: string | null;
}): Promise<ConnectionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  if (input.marketplace_tenant_id === tenant.tenant.id) {
    return { ok: false, error: "That's your own business." };
  }
  const supabase = await createSupabaseServer();

  const { data: existing } = await supabase
    .from('resources')
    .select('id')
    .eq('tenant_id', tenant.tenant.id)
    .eq('marketplace_tenant_id', input.marketplace_tenant_id)
    .maybeSingle();
  if (existing?.id) return { ok: true };

  const { error } = await supabase.from('resources').insert({
    tenant_id: tenant.tenant.id,
    kind: 'subcontractor',
    display_name: input.display_name,
    trade: input.trade,
    marketplace_tenant_id: input.marketplace_tenant_id,
    connection_status: 'connected',
    cost_rate_pence: input.day_rate_pence,
    cost_rate_unit: input.day_rate_unit === 'hour' ? 'hour' : 'day',
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${tenant.tenant.slug}/workforce`);
  revalidatePath(`/${tenant.tenant.slug}/hire`);
  return { ok: true };
}
