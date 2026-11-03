import type { TenantMemberRole } from '@br/shared';

/**
 * Entitlement hook for Planning Radar. Free-first: included for every active
 * trade's subscription today. To gate it to a paid tier later, add a
 * subscription_tier check here — every entry point (nav, pages) runs it.
 */
export function planningRadarEntitled(role: TenantMemberRole | null): boolean {
  return role === 'owner' || role === 'pm';
}

/**
 * PlanIt listing IDs contain slashes (e.g. "Barnet/26/3664/HSE"), which break
 * Next.js's single-segment [id] dynamic route. Encode URL-safely (base64url,
 * no slashes) for links and decode on the detail page.
 */
export function encodePlanningId(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}
export function decodePlanningId(seg: string): string {
  try {
    return Buffer.from(seg, 'base64url').toString('utf8');
  } catch {
    return seg;
  }
}
