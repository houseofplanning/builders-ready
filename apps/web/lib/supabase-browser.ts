'use client';

import { createBrowserClient } from '@supabase/ssr';

let singleton: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser-side Supabase singleton. Multiple Client Components share one
 * instance so a single SUBSCRIBE channel covers the whole app.
 */
export function getSupabaseBrowser() {
  if (singleton) return singleton;
  singleton = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return singleton;
}
