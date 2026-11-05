import { supabase } from './supabase';

/**
 * A connected person's own booking with the limited job context the spec
 * allows (no money, no other resources). Comes straight from the
 * `my_schedule()` SECURITY DEFINER RPC.
 */
export interface MyScheduleItem {
  assignment_id: string;
  starts_at: string;
  ends_at: string;
  booking_kind: string;
  status: string;
  note: string | null;
  project_id: string;
  project_name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  stage_name: string | null;
  business_tenant_id: string | null;
  business_name: string | null;
  business_phone: string | null;
  pm_name: string | null;
  pm_phone: string | null;
}

/** My upcoming bookings across every builder who has me on a job. */
export async function getMySchedule(): Promise<MyScheduleItem[]> {
  const { data, error } = await supabase.rpc('my_schedule');
  if (error) throw error;
  return (data ?? []) as MyScheduleItem[];
}

/** Confirm I'm coming to one of my bookings. */
export async function confirmMyAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_my_assignment', { p_id: assignmentId });
  if (error) throw error;
}

/** One line of address for display, from whatever parts exist. */
export function shortAddress(i: MyScheduleItem): string {
  return [i.address_line1, i.city, i.postcode].filter(Boolean).join(', ');
}
