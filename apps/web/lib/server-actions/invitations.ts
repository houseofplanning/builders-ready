'use server';

import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '../supabase-server';
import { getSupabaseAdmin } from '../supabase-admin';
import { resolveCurrentTenant } from '../tenant-resolver';
import { sendInvitationEmail } from '../email';

// -------------------------------------------------------------------------
// createInvitation
// -------------------------------------------------------------------------
const createSchema = z.object({
  email: z.string().email().max(255).transform((s) => s.trim().toLowerCase()),
  role: z.enum(['pm', 'client']),
});

export interface InvitationResult {
  ok: boolean;
  error?: string;
}

export async function createInvitation(
  raw: Record<string, unknown>,
): Promise<InvitationResult> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email and pick a role.' };
  }
  const { email, role } = parsed.data;

  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can invite.' };
  }

  const admin = getSupabaseAdmin();

  // Refuse if that email already has a Builders Ready account — v1 doesn't
  // support a single user across multiple tenants.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();
  if (existingProfile) {
    return {
      ok: false,
      error:
        "That email already has a Builders Ready account. They'll need to sign in with their existing password, or use a different email.",
    };
  }

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  // If there's already a pending invitation for this tenant + email, refresh
  // it (new token + new expiry). Otherwise insert a fresh row.
  const { data: pending } = await admin
    .from('invitations')
    .select('id')
    .eq('tenant_id', tenant.tenant.id)
    .ilike('email', email)
    .is('accepted_at', null)
    .maybeSingle();

  if (pending) {
    const { error: updErr } = await admin
      .from('invitations')
      .update({
        token,
        expires_at: expiresAt,
        role,
        invited_by: tenant.user_id,
      })
      .eq('id', pending.id);
    if (updErr) return { ok: false, error: updErr.message };
  } else {
    const { error: insErr } = await admin.from('invitations').insert({
      tenant_id: tenant.tenant.id,
      email,
      role,
      token,
      expires_at: expiresAt,
      invited_by: tenant.user_id,
    });
    if (insErr) return { ok: false, error: insErr.message };
  }

  // Inviter's display name for the email body
  let inviterName = 'Your project lead';
  const { data: inviterProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', tenant.user_id)
    .maybeSingle();
  if (inviterProfile?.full_name) inviterName = inviterProfile.full_name;

  try {
    await sendInvitationEmail({
      to: email,
      tenantName: tenant.tenant.name,
      inviterName,
      role,
      token,
    });
  } catch (err) {
    // The DB row is in place; email failed. Tell the user so they can hit
    // "Resend" rather than the invitee being stuck silently.
    return {
      ok: false,
      error: `Invitation saved but email failed to send: ${
        err instanceof Error ? err.message : 'unknown'
      }. Tap Resend to try again.`,
    };
  }

  revalidatePath(`/${tenant.tenant.slug}/team`);
  return { ok: true };
}

// -------------------------------------------------------------------------
// revokeInvitation
// -------------------------------------------------------------------------
export async function revokeInvitation(invitationId: string): Promise<InvitationResult> {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { ok: false, error: 'Not signed in.' };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { ok: false, error: 'Only owners and PMs can revoke invitations.' };
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', tenant.tenant.id)
    .is('accepted_at', null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/team`);
  return { ok: true };
}

// -------------------------------------------------------------------------
// acceptInvitation
// -------------------------------------------------------------------------
const acceptSchema = z.object({
  token: z.string().min(8).max(128),
  full_name: z.string().min(2).max(120),
  password: z.string().min(12).max(72),
});

export interface AcceptResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export async function acceptInvitation(
  raw: Record<string, unknown>,
): Promise<AcceptResult> {
  const parsed = acceptSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Check your name and password (12+ characters).',
    };
  }
  const { token, full_name, password } = parsed.data;
  const admin = getSupabaseAdmin();

  // 1. Validate token
  const { data: invite } = await admin
    .from('invitations')
    .select(
      'id, tenant_id, email, role, expires_at, accepted_at, tenant:tenants(slug)',
    )
    .eq('token', token)
    .maybeSingle();
  if (!invite) {
    return { ok: false, error: 'Invitation not found or already used.' };
  }
  if (invite.accepted_at) {
    return {
      ok: false,
      error: 'This invitation has already been accepted. Sign in with your existing password.',
    };
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      error: 'This invitation has expired. Ask the builder to send a new one.',
    };
  }
  const tenantSlug = (Array.isArray(invite.tenant) ? invite.tenant[0] : invite.tenant)?.slug;

  // 2. Belt-and-braces: refuse if email now collides with an existing user
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', invite.email)
    .maybeSingle();
  if (existingProfile) {
    return {
      ok: false,
      error:
        'That email already has a Builders Ready account. Sign in with your existing password.',
    };
  }

  // 3. Admin-create the auth user with email auto-confirmed
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createErr || !created.user) {
    return {
      ok: false,
      error: createErr?.message ?? 'Could not create account.',
    };
  }
  const userId = created.user.id;

  // 4. Insert membership row
  const { error: memberErr } = await admin.from('tenant_members').insert({
    tenant_id: invite.tenant_id,
    user_id: userId,
    role: invite.role,
    invited_by: null, // we don't carry inviter through; the invitations row has the audit
    invited_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
  });
  if (memberErr) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: memberErr.message };
  }

  // 5. Mark invitation accepted
  await admin
    .from('invitations')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_via_email: invite.email,
    })
    .eq('id', invite.id);

  // 6. Sign in via cookie-based client so the redirect target has a session
  const supabase = await createSupabaseServer();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInErr) {
    return { ok: false, error: signInErr.message };
  }

  // 7. Decide where to land them — clients use mobile primarily, but the
  //    web dashboard is still a useful first stop so they can see the
  //    builder's branding and what they've been invited to.
  return {
    ok: true,
    redirectTo: tenantSlug ? `/${tenantSlug}/dashboard` : '/',
  };
}
