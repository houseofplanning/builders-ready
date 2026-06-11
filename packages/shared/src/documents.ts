/**
 * Document vault shared types. Mirrors the `document_category` enum and
 * `documents` table created in supabase/migrations/20260519000013.
 */

export const DOCUMENT_CATEGORIES = [
  'contract',
  'plans',
  'certificates',
  'warranties',
  'other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  contract: 'Contract',
  plans: 'Plans & drawings',
  certificates: 'Certificates',
  warranties: 'Warranties',
  other: 'Other',
};

export interface ProjectDocument {
  id: string;
  tenant_id: string;
  project_id: string;
  uploaded_by: string | null;
  name: string;
  category: DocumentCategory;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

/** Human-readable file size, e.g. 1.2 MB. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
