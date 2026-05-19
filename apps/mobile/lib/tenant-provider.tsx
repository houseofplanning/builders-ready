import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Tenant,
  TenantMemberRole,
  TenantPalette,
} from '@br/shared';
import { buildTenantPalette, palette as defaultPalette } from '@br/shared';
import { supabase } from './supabase';
import { useSession } from './session';

const CACHE_KEY = 'br.tenant.v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedShape {
  cached_at: number;
  tenant: Tenant;
  role: TenantMemberRole;
  user_id: string;
}

interface TenantContextValue {
  tenant: Tenant | null;
  role: TenantMemberRole | null;
  user_id: string | null;
  palette: TenantPalette;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  role: null,
  user_id: null,
  palette: defaultPalette as TenantPalette,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useTenant() {
  return useContext(TenantContext);
}

/**
 * TenantProvider — loaded at the root of the signed-in app.
 *
 * Fetches the user's tenant + role on session start. Caches in AsyncStorage
 * for 24 hours so subsequent app launches render the branded shell
 * before the network round-trip resolves.
 */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<TenantMemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(
    async (uid: string, { useCache = true }: { useCache?: boolean } = {}) => {
      setError(null);
      // 1. Try AsyncStorage cache first for instant paint.
      if (useCache) {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as CachedShape;
            const fresh = Date.now() - cached.cached_at < CACHE_TTL_MS;
            if (fresh && cached.user_id === uid) {
              setTenant(cached.tenant);
              setRole(cached.role);
              setLoading(false);
            }
          }
        } catch {
          // ignore cache read errors
        }
      }

      // 2. Network fetch — always, even on cache hit, so we self-heal stale data.
      const { data, error: fetchErr } = await supabase
        .from('tenant_members')
        .select('role, tenant:tenants(*)')
        .eq('user_id', uid)
        .maybeSingle();

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }
      if (!data || !data.tenant) {
        // Signed in but no tenant — owner who hasn't finished onboarding,
        // or a stale session for a deleted membership.
        setTenant(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const t = data.tenant as unknown as Tenant;
      const r = data.role as TenantMemberRole;
      setTenant(t);
      setRole(r);
      setLoading(false);

      try {
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            cached_at: Date.now(),
            user_id: uid,
            tenant: t,
            role: r,
          } satisfies CachedShape),
        );
      } catch {
        // ignore cache write errors
      }
    },
    [],
  );

  useEffect(() => {
    if (sessionLoading) return;
    if (!userId) {
      setTenant(null);
      setRole(null);
      setLoading(false);
      AsyncStorage.removeItem(CACHE_KEY).catch(() => null);
      return;
    }
    setLoading(true);
    fetchTenant(userId);
  }, [userId, sessionLoading, fetchTenant]);

  const palette = useMemo<TenantPalette>(
    () =>
      tenant
        ? buildTenantPalette({
            primary: tenant.brand_primary,
            accent: tenant.brand_accent,
          })
        : (defaultPalette as TenantPalette),
    [tenant],
  );

  const value: TenantContextValue = {
    tenant,
    role,
    user_id: userId,
    palette,
    loading: loading || sessionLoading,
    error,
    refresh: async () => {
      if (userId) await fetchTenant(userId, { useCache: false });
    },
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
