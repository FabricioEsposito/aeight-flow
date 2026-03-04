import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Extracts the storage path from a Supabase storage URL.
 */
function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url);
    const publicPath = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
    if (publicPath[1]) return decodeURIComponent(publicPath[1].split('?')[0]);
    const signedPath = urlObj.pathname.split(`/storage/v1/object/sign/${bucket}/`);
    if (signedPath[1]) return decodeURIComponent(signedPath[1].split('?')[0]);
    return null;
  } catch {
    return null;
  }
}

/**
 * Opens a private storage file in a new tab using a signed URL.
 */
export async function openStorageFile(publicUrl: string, bucket = 'faturamento-docs') {
  const filePath = extractPathFromUrl(publicUrl, bucket);
  if (!filePath) {
    toast.error('Não foi possível localizar o arquivo.');
    return;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    console.error('Signed URL error:', error);
    toast.error('Erro ao gerar link de acesso ao arquivo.');
    return;
  }

  window.open(data.signedUrl, '_blank');
}
