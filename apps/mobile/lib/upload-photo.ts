// SDK 54 deprecated the top-level `expo-file-system` API in favour of the
// new File/Directory classes. We stick with the legacy API for now — it's
// stable, works identically, and silences the migration warning.
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * RN-correct photo upload to Supabase Storage.
 *
 * The fetch().blob() pattern that works on web silently produces 0-byte
 * files on iOS — `Blob` is broken in RN's polyfill. The working pattern,
 * inherited from the Regal precedent:
 *
 *   1. ImageManipulator → resize (max 2048px) + JPEG compress (q=0.82)
 *   2. expo-file-system readAsStringAsync('base64')
 *   3. base64-arraybuffer decode → ArrayBuffer
 *   4. supabase.storage.upload(arrayBuffer, { contentType })
 *
 * Returns the storage object path on success.
 */

export interface CompressedAsset {
  uri: string;
  width: number;
  height: number;
  byteSize: number;
}

export const MAX_LONG_EDGE = 2048;
export const JPEG_QUALITY = 0.82;

export async function compressImage(uri: string): Promise<CompressedAsset> {
  // Resize so the long edge is MAX_LONG_EDGE. ImageManipulator preserves
  // aspect ratio when only one dimension is given.
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_LONG_EDGE } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Get the compressed file size.
  const info = await FileSystem.getInfoAsync(result.uri, { size: true });
  const byteSize = info.exists && 'size' in info ? (info.size as number) : 0;

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    byteSize,
  };
}

export interface UploadParams {
  tenantId: string;
  projectId: string;
  updateId: string;
  /** Index of this photo within the update — used in the filename. */
  index: number;
  asset: CompressedAsset;
}

export interface UploadedPhoto {
  storage_path: string;
  width: number;
  height: number;
  byte_size: number;
}

export interface UploadDecisionPhotoParams {
  tenantId: string;
  projectId: string;
  /** Stable identifier for the decision option (use a uuid v4 or similar). */
  optionKey: string;
  asset: CompressedAsset;
}

/**
 * Upload a photo attached to a decision option. Uses the same
 * `update-photos` bucket and the same storage RLS policy (which checks
 * folder segments 1+2 are the caller's tenant + an accessible project).
 *
 *   update-photos/<tenant_id>/<project_id>/decisions/<option_key>.jpg
 *
 * Returns the storage path (no DB row inserted — the caller writes the
 * `decision_options.photo_storage_path` field directly when it creates
 * the option row).
 */
export async function uploadDecisionPhoto(
  p: UploadDecisionPhotoParams,
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(p.asset.uri, {
    encoding: 'base64',
  });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const objectPath = `${p.tenantId}/${p.projectId}/decisions/${p.optionKey}.jpg`;

  const { error } = await supabase.storage
    .from('update-photos')
    .upload(objectPath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw new Error(`decision photo upload failed: ${error.message}`);
  return objectPath;
}

/**
 * Upload one compressed asset to the `update-photos` bucket and return
 * the storage path (NOT including the bucket prefix — Supabase Storage
 * APIs work with paths relative to the bucket).
 */
export async function uploadPhoto(p: UploadParams): Promise<UploadedPhoto> {
  const base64 = await FileSystem.readAsStringAsync(p.asset.uri, {
    encoding: 'base64',
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  const ts = Date.now();
  const filename = `${ts}-${p.index}.jpg`;
  const objectPath = `${p.tenantId}/${p.projectId}/${p.updateId}/${filename}`;

  const { error: uploadErr } = await supabase.storage
    .from('update-photos')
    .upload(objectPath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (uploadErr) {
    throw new Error(`upload failed: ${uploadErr.message}`);
  }

  // Register the row so the feed picks it up. RLS checks via
  // assert_tenant_match + the photos_write policy.
  const { error: insertErr } = await supabase.from('update_photos').insert({
    tenant_id: p.tenantId,
    update_id: p.updateId,
    storage_path: objectPath,
    width: p.asset.width,
    height: p.asset.height,
    byte_size: p.asset.byteSize,
    position: p.index,
  });
  if (insertErr) {
    // Clean up the orphaned storage object before propagating the error.
    await supabase.storage.from('update-photos').remove([objectPath]).catch(() => null);
    throw new Error(`photo row insert failed: ${insertErr.message}`);
  }

  return {
    storage_path: objectPath,
    width: p.asset.width,
    height: p.asset.height,
    byte_size: p.asset.byteSize,
  };
}
