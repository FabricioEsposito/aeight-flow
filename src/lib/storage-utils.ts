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
 * Opens a private storage file in a new tab using a local Blob URL.
 * This avoids browser/client blockers that can block direct navigation to Supabase signed URLs.
 */
export async function openStorageFile(publicUrl: string, bucket = 'faturamento-docs') {
  const filePath = extractPathFromUrl(publicUrl, bucket);
  if (!filePath) {
    toast.error('Não foi possível localizar o arquivo.');
    return;
  }

  const previewWindow = window.open('', '_blank');
  previewWindow?.document.write('<!doctype html><title>Abrindo arquivo...</title><p style="font-family:sans-serif">Abrindo arquivo...</p>');

  const downloadFile = async (path: string) => supabase.storage.from(bucket).download(path);
  let { data, error } = await downloadFile(filePath);

  if (error || !data) {
    const replacementPath = await findReplacementPath(filePath, bucket);
    if (replacementPath) ({ data, error } = await downloadFile(replacementPath));
  }

  if (error || !data) {
    console.error('Storage download error:', error);
    previewWindow?.close();
    toast.error('Erro ao gerar link de acesso ao arquivo.');
    return;
  }

  const blobUrl = URL.createObjectURL(data);
  if (previewWindow) {
    previewWindow.location.href = blobUrl;
  } else {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10 * 60 * 1000);
}
