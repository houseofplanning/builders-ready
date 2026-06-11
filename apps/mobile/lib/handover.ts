import { supabase } from './supabase';

/**
 * Get a signed URL for a project's handover PDF. The web admin generates
 * the PDF (server-side with @react-pdf/renderer); mobile only ever
 * downloads / opens.
 */
export async function getHandoverSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('handovers')
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
