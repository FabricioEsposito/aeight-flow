import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, File, X, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  bucket: string;
  path: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  className?: string;
}

export function FileUpload({
  bucket,
  path,
  value,
  onChange,
  accept = 'application/pdf',
  maxSizeMB = 10,
  label,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate signed URL when value changes
  useEffect(() => {
    if (!value) {
      setSignedUrl(null);
      return;
    }
    const filePath = extractPathFromUrl(value);
    if (!filePath) return;

    supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600) // 1 hour
      .then(({ data, error: err }) => {
        if (err) {
          console.error('Signed URL error:', err);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      });
  }, [value, bucket]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (accept) {
      const acceptTokens = accept
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const fileName = file.name.toLowerCase();
      const fileType = (file.type || '').toLowerCase();

      const matches = acceptTokens.some((token) => {
        const t = token.toLowerCase();
        if (t === '*/*') return true;
        if (t.startsWith('.')) return fileName.endsWith(t);
        if (t.endsWith('/*')) return fileType.startsWith(t.replace('/*', '/'));
        return fileType === t;
      });

      if (!matches) {
        setError('Tipo de arquivo não permitido. Selecione um PDF.');
        return;
      }
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(10);

    try {
      // If there's an existing file, delete it first
      if (value) {
        const existingPath = extractPathFromUrl(value);
        if (existingPath) {
          await supabase.storage.from(bucket).remove([existingPath]);
        }
      }

      setProgress(30);

      // Upload new file
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      setProgress(80);

      // Store a reference path (not a public URL) - we'll generate signed URLs on demand
      // We still store a full URL for backward compatibility but will use signed URLs to view
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      const url = new URL(urlData.publicUrl);
      url.searchParams.set('v', String(Date.now()));

      setProgress(100);
      onChange(url.toString());
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    setUploading(true);
    try {
      const existingPath = extractPathFromUrl(value);
      if (existingPath) {
        await supabase.storage.from(bucket).remove([existingPath]);
      }
      onChange(null);
    } catch (err: any) {
      console.error('Remove error:', err);
      setError(err.message || 'Erro ao remover arquivo');
    } finally {
      setUploading(false);
    }
  };

  const extractPathFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
      if (pathParts[1]) return pathParts[1];
      // Also handle signed URL paths
      const signedParts = urlObj.pathname.split(`/storage/v1/object/sign/${bucket}/`);
      return signedParts[1] || null;
    } catch {
      return null;
    }
  };

  const getFileName = (url: string): string => {
    try {
      const path = extractPathFromUrl(url);
      if (path) {
        return path.split('/').pop() || 'arquivo.pdf';
      }
      return 'arquivo.pdf';
    } catch {
      return 'arquivo.pdf';
    }
  };

  const handleView = async () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else if (value) {
      // Fallback: try generating on the fly
      const filePath = extractPathFromUrl(value);
      if (filePath) {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      }
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {uploading ? (
        <div className="space-y-2 p-3 border rounded-md bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Enviando arquivo...</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      ) : value ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
          <File className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm truncate flex-1">{getFileName(value)}</span>
          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleView}
              title="Visualizar"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleRemove}
              title="Remover"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          <span>Selecionar PDF</span>
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
