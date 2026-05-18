import { createContext, useContext } from 'react';
import type { Tenant, TenantMemberRole, TenantPalette } from '@br/shared';

/**
 * TenantContext — loaded once at session start from tenant_members + tenants,
 * cached in AsyncStorage with a 24-hour TTL, and exposed to the rest of the
 * app via useTenant().
 *
 * The Provider implementation lives in app/_layout.tsx (built once auth is
 * wired). This file defines the shape and the hook.
 */
export interface TenantContextValue {
  tenant: Tenant | null;
  role: TenantMemberRole | null;
  palette: TenantPalette | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  role: null,
  palette: null,
  loading: true,
  refresh: async () => {},
});

export function useTenant() {
  return useContext(TenantContext);
}
