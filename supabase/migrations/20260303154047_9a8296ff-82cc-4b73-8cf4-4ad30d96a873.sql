
-- Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('faturamento-docs', 'holerites');

-- Drop public SELECT policies
DROP POLICY IF EXISTS "Leitura pública dos documentos de faturamento" ON storage.objects;
DROP POLICY IF EXISTS "Leitura publica dos holerites" ON storage.objects;

-- Create authenticated SELECT policy for faturamento-docs only (holerites already has one)
CREATE POLICY "Authenticated users can read faturamento docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'faturamento-docs');
