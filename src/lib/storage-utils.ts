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
    return url && !url.includes('://') ? url : null;
  }
}

async function findReplacementPath(filePath: string, bucket: string): Promise<string | null> {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash < 0) return null;

  const folder = filePath.slice(0, lastSlash);
  const fileName = filePath.slice(lastSlash + 1).toLowerCase();
  const prefix = fileName.startsWith('boleto') ? 'boleto' : fileName.startsWith('nf') ? 'nf' : null;
  if (!prefix) return null;

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
    sortBy: { column: 'updated_at', order: 'desc' },
  });

  if (error || !data?.length) return null;

  const replacement = data.find((file) => {
    const name = file.name.toLowerCase();
    return name.startsWith(`${prefix}.`) || name.startsWith(`${prefix}-`);
  });

  return replacement ? `${folder}/${replacement.name}` : null;
}

/**
 * Opens a private storage file directly in a new browser tab for inline viewing
 * (PDF/image preview), instead of forcing a download.
 */
export async function openStorageFile(publicUrl: string, bucket = 'faturamento-docs') {
  const filePath = extractPathFromUrl(publicUrl, bucket);
  if (!filePath) {
    toast.error('Não foi possível localizar o arquivo.');
    return;
  }

  const createSigned = async (path: string) =>
    supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);

  let { data, error } = await createSigned(filePath);

  if (error || !data?.signedUrl) {
    const replacementPath = await findReplacementPath(filePath, bucket);
    if (replacementPath) ({ data, error } = await createSigned(replacementPath));
  }

  if (error || !data?.signedUrl) {
    console.error('Storage signed URL error:', error);
    toast.error('Erro ao gerar link de acesso ao arquivo.');
    return;
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
