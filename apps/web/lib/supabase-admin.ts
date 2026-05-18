import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. **Bypasses RLS.** Use sparingly and
 * NEVER expose this to client code.
 *
 * Use cases:
 *   - admin.createUser during signup (so we don't depend on email confirmation)
 *   - cross-tenant introspection in webhook handlers / platform tools
 *
 * Anything that can be expressed via RLS should be — keep this client for
 * the operations RLS genuinely can't authorise (chicken-and-egg signup, etc.)
 */
let singleton: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (singleton) return singleton;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
    );
  }
  singleton = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { 'x-application-name': 'builders-ready-admin' },
    },
  });
  return singleton;
}
