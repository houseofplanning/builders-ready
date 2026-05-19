import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * useSession — single source of truth for the user's auth state on mobile.
 *
 * Subscribes to supabase.auth state changes and exposes:
 *   - `session`: current session, or null if not signed in
 *   - `loading`: true while the initial getSession() resolves (so the auth
 *     gate doesn't flash the login screen on cold-start with a cached token)
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
