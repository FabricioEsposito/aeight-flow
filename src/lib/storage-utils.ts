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

  const downloadFile = async (path: string) => supabase.storage.from(bucket).download(path);
  let { data, error } = await downloadFile(filePath);

  if (error || !data) {
    const replacementPath = await findReplacementPath(filePath, bucket);
    if (replacementPath) ({ data, error } = await downloadFile(replacementPath));
  }

  if (error || !data) {
    console.error('Storage download error:', error);
    toast.error('Erro ao gerar link de acesso ao arquivo.');
    return;
  }

  // Infer file name and content type
  const fileName = filePath.split('/').pop() || 'arquivo';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const contentType =
    data.type ||
    (ext === 'pdf' ? 'application/pdf'
      : ext === 'png' ? 'image/png'
      : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : 'application/octet-stream');

  const typedBlob = new Blob([data], { type: contentType });
  const blobUrl = URL.createObjectURL(typedBlob);

  // Try opening in a new tab; in private/strict modes popups can be blocked,
  // so always provide a download fallback via anchor click (preserves user gesture).
  const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');

  if (!opened || opened.closed || typeof opened.closed === 'undefined') {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10 * 60 * 1000);
}
