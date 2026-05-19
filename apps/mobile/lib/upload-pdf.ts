import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Upload a PDF (typically a builder's existing weekly report template)
 * to the `reports` bucket. Same RN-correct base64 → ArrayBuffer pattern
 * as photo uploads — no compression.
 *
 * Path: `<tenant_id>/<project_id>/<timestamp>-<sanitised_filename>.pdf`
 *
 * Returns the storage object path. The caller writes that path into
 * `reports.pdf_storage_path` when inserting the report row.
 */
export interface UploadPdfParams {
  tenantId: string;
  projectId: string;
  filename: string;
  uri: string;
}

const MAX_BYTES = 40 * 1024 * 1024; // 40 MiB — matches storage bucket limit

export async function uploadReportPdf(p: UploadPdfParams): Promise<string> {
  // Validate the file size up front so we don't waste a base64 read.
  const info = await FileSystem.getInfoAsync(p.uri, { size: true });
  if (info.exists && 'size' in info) {
    const size = info.size as number;
    if (size > MAX_BYTES) {
      throw new Error(
        `PDF is too large (${(size / 1024 / 1024).toFixed(1)} MiB). Max 40 MiB.`,
      );
    }
  }

  const base64 = await FileSystem.readAsStringAsync(p.uri, {
    encoding: 'base64',
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  const sanitised = p.filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-|-$/g, '');
  const objectPath = `${p.tenantId}/${p.projectId}/${Date.now()}-${sanitised}`;

  const { error } = await supabase.storage
    .from('reports')
    .upload(objectPath, arrayBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);
  return objectPath;
}
