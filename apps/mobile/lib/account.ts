// Customer (and trade) account data: profile, avatar, notification prefs,
// reviews, password. All reads/writes are the signed-in user's own row,
// enforced by the profiles `self_update` / `self_read` RLS policies and the
// `avatars_self_write` storage policy (path must start with the user id).
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { compressImage } from './upload-photo';

export interface NotificationPrefs {
  push: boolean;
  email: boolean;
}

export interface AccountProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  notification_prefs: NotificationPrefs;
}

const DEFAULT_PREFS: NotificationPrefs = { push: true, email: true };

export async function getMyAccount(userId: string): Promise<AccountProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, notification_prefs')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  const prefs = (data.notification_prefs ?? {}) as Partial<NotificationPrefs>;
  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    avatar_url: data.avatar_url,
    notification_prefs: {
      push: prefs.push ?? DEFAULT_PREFS.push,
      email: prefs.email ?? DEFAULT_PREFS.email,
    },
  };
}

export async function updateMyProfile(
  userId: string,
  patch: { full_name?: string; phone?: string | null },
): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (patch.full_name !== undefined) clean.full_name = patch.full_name.trim();
  if (patch.phone !== undefined) {
    const p = (patch.phone ?? '').trim();
    clean.phone = p.length ? p : null;
  }
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase.from('profiles').update(clean).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/**
 * Compress the picked image, upload to the public `avatars` bucket under
 * `<uid>/avatar-<ts>.jpg` (the storage RLS requires the first path segment
 * to be the caller's uid), persist the public URL on the profile, and
 * return it. A timestamped filename busts the CDN cache so the new photo
 * shows immediately.
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const asset = await compressImage(uri);
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (upErr) throw new Error(`Avatar upload failed: ${upErr.message}`);

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = pub.publicUrl;

  const { error: profErr } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (profErr) throw new Error(profErr.message);
  return url;
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}

export interface MyReview {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  counterpart_name: string;
}

export interface MyReviews {
  aboutMe: MyReview[];
  byMe: MyReview[];
  averageAboutMe: number | null;
}

/**
 * Reviews about the user (reviewee) and reviews the user wrote (reviewer),
 * each labelled with the other party's name. Reviews are world-readable to
 * authed users (reviews_select = auth.uid() is not null), and names are
 * resolved from profiles (readable for the counterpart via self/tenant rules;
 * falls back to a generic label when hidden).
 */
export async function listMyReviews(userId: string): Promise<MyReviews> {
  const [{ data: about }, { data: by }] = await Promise.all([
    supabase
      .from('marketplace_reviews')
      .select('id, rating, body, created_at, reviewer_id')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('marketplace_reviews')
      .select('id, rating, body, created_at, reviewee_id')
      .eq('reviewer_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const aboutRows = about ?? [];
  const byRows = by ?? [];

  // Resolve counterpart names in one batch.
  const ids = new Set<string>();
  aboutRows.forEach((r) => ids.add(r.reviewer_id as string));
  byRows.forEach((r) => ids.add(r.reviewee_id as string));
  const names = new Map<string, string>();
  if (ids.size) {
    const { data: people } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [...ids]);
    (people ?? []).forEach((p) =>
      names.set(p.id as string, (p.full_name as string) ?? 'Someone'),
    );
  }

  const aboutMe: MyReview[] = aboutRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    counterpart_name: names.get(r.reviewer_id as string) ?? 'A builder',
  }));
  const byMe: MyReview[] = byRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    counterpart_name: names.get(r.reviewee_id as string) ?? 'A builder',
  }));

  const averageAboutMe =
    aboutMe.length > 0
      ? Math.round((aboutMe.reduce((s, r) => s + r.rating, 0) / aboutMe.length) * 10) / 10
      : null;

  return { aboutMe, byMe, averageAboutMe };
}
