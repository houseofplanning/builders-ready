import { supabase } from './supabase';

/**
 * Tiny in-memory cache of signed URLs for the `update-photos` (private)
 * and `reports` buckets. Avoids re-requesting the URL every render as
 * the feed scrolls.
 *
 * Each entry expires 5 minutes before the actual signed-URL expiry so
 * we never hand out a URL that's about to die.
 */

interface CacheEntry {
  url: string;
  /** Absolute time (ms) at which this cached entry is considered stale. */
  expires_at: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const SAFETY_MARGIN_MS = 5 * 60 * 1000;

export async function getSignedUrl(
  bucket: 'update-photos' | 'reports',
  path: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  const key = `${bucket}::${path}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expires_at) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  cache.set(key, {
    url: data.signedUrl,
    expires_at: Date.now() + ttlSeconds * 1000 - SAFETY_MARGIN_MS,
  });
  return data.signedUrl;
}

/**
 * Pre-fetch a batch of signed URLs in parallel and return them as a map
 * keyed by storage_path.
 */
export async function getSignedUrls(
  bucket: 'update-photos' | 'reports',
  paths: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    paths.map(async (p) => {
      const url = await getSignedUrl(bucket, p);
      if (url) out[p] = url;
    }),
  );
  return out;
}
