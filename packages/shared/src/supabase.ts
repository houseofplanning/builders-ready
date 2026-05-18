import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client. Each app (mobile, web) supplies its own
 * storage adapter — AsyncStorage on RN, cookies on Next.js.
 *
 * Do NOT call this at module top level in app code. Always create the client
 * inside the platform's setup file (apps/mobile/lib/supabase.ts,
 * apps/web/lib/supabase-browser.ts).
 */
export interface CreateSupabaseClientOptions {
  url: string;
  anonKey: string;
  storage?: {
    getItem(key: string): Promise<string | null> | string | null;
    setItem(key: string, value: string): Promise<void> | void;
    removeItem(key: string): Promise<void> | void;
  };
  detectSessionInUrl?: boolean;
  persistSession?: boolean;
}

export function makeSupabaseClient(
  opts: CreateSupabaseClientOptions,
): SupabaseClient {
  return createClient(opts.url, opts.anonKey, {
    auth: {
      storage: opts.storage as never,
      autoRefreshToken: true,
      persistSession: opts.persistSession ?? true,
      detectSessionInUrl: opts.detectSessionInUrl ?? false,
    },
    global: {
      headers: {
        'x-application-name': 'builders-ready',
      },
    },
  });
}

/**
 * Storage bucket names. Keep in lockstep with
 * supabase/migrations/*storage_buckets.sql.
 */
export const BUCKETS = {
  updatePhotos: 'update-photos',
  reports: 'reports',
  avatars: 'avatars',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Compose a tenant-scoped storage object key.
 *   tenantPath('update-photos', tenantId, projectId, updateId, 'a.jpg')
 *   -> 'update-photos/<tenantId>/<projectId>/<updateId>/a.jpg'
 *
 * (Bucket itself is not part of the object key — Supabase stores it
 * separately. But we still produce the bucket-prefixed string for logs.)
 */
export function tenantObjectKey(...segments: string[]): string {
  return segments.filter(Boolean).join('/');
}
