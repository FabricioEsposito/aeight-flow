import React, { useState, useRef } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      setError('Tipo de arquivo não permitido. Selecione um PDF.');
      return;
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      onChange(urlData.publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset input
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
      return pathParts[1] || null;
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
              onClick={() => window.open(value, '_blank')}
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
