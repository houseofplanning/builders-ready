'use server';

import { revalidatePath } from 'next/cache';
import type { BookingKind } from '@br/shared';
import { createSupabaseServer } from '../supabase-server';
import { resolveCurrentTenant } from '../tenant-resolver';
import { sendBookingEmail } from '../email';

/** Human label for a booking's date span, e.g. "Mon 10 Nov" or a range. */
function whenLabel(days: string[]): string {
  if (days.length === 0) return '';
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  if (days.length === 1) return fmt(days[0]!);
  return `${fmt(days[0]!)} – ${fmt(days[days.length - 1]!)} (${days.length} days)`;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  created?: number;
}

export interface AssignInput {
  project_id: string;
  resource_id: string;
  stage_id: string | null;
  /** Inclusive date range (YYYY-MM-DD). One booking is created per weekday. */
  from_date: string;
  to_date: string;
  booking_kind: BookingKind;
  note: string | null;
}

/** Weekday dates (Mon–Fri) in an inclusive range, capped for safety. */
function weekdays(from: string, to: string, cap = 120): string[] {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (!(start <= end)) return [];
  const out: string[] = [];
  const d = new Date(start);
  while (d <= end && out.length < cap) {
    const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function ownerOrPm() {
  const tenant = await resolveCurrentTenant();
  if (!tenant) return { error: 'Not signed in.' as const };
  if (tenant.role !== 'owner' && tenant.role !== 'pm') {
    return { error: 'Only owners and PMs can schedule.' as const };
  }
  return { tenant };
}

/**
 * Assign a resource to a project across a date range. Creates one booking per
 * weekday (08:00–16:00), so each is a clean working day and the cost trigger
 * (rate x 8h) is correct. The scheduler will later allow part-days and drags.
 */
export async function createProjectAssignment(input: AssignInput): Promise<ActionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;

  const days = weekdays(input.from_date, input.to_date);
  if (days.length === 0) return { ok: false, error: 'Pick a valid date range.' };

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, error: 'Not signed in.' };

  const rows = days.map((day) => ({
    tenant_id: tenant.tenant.id,
    project_id: input.project_id,
    resource_id: input.resource_id,
    stage_id: input.stage_id || null,
    starts_at: `${day}T08:00:00Z`,
    ends_at: `${day}T16:00:00Z`,
    booking_kind: input.booking_kind,
    status: 'planned' as const,
    note: input.note?.trim() || null,
    created_by: uid,
  }));

  const { error } = await supabase.from('assignments').insert(rows);
  if (error) return { ok: false, error: error.message };

  // Notify the person if they're connected (push + in-app via the RPC; email
  // via Resend). Never block the booking on a notification hiccup.
  try {
    const { data: notif } = await supabase.rpc('notify_resource_booked', {
      p_resource_id: input.resource_id,
      p_project_id: input.project_id,
    });
    const row = Array.isArray(notif) ? notif[0] : notif;
    const email = (row as { recipient_email?: string } | null)?.recipient_email;
    if (email) {
      await sendBookingEmail({
        to: email,
        recipientName: (row as { recipient_name?: string }).recipient_name ?? null,
        businessName: (row as { business_name?: string }).business_name ?? tenant.tenant.name,
        projectName: (row as { project_name?: string }).project_name ?? 'a job',
        whenLabel: whenLabel(days),
      });
    }
  } catch {
    // Booking already succeeded; a failed notification must not fail the action.
  }

  revalidatePath(`/${tenant.tenant.slug}/projects/${input.project_id}`);
  return { ok: true, created: rows.length };
}

/** Remove a resource's bookings from a project (all of them). */
export async function removeResourceFromProject(
  projectId: string,
  resourceId: string,
): Promise<ActionResult> {
  const gate = await ownerOrPm();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { tenant } = gate;
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('project_id', projectId)
    .eq('resource_id', resourceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${tenant.tenant.slug}/projects/${projectId}`);
  return { ok: true };
}
