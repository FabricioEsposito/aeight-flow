-- Criar bucket para documentos de faturamento (NF e Boleto)
INSERT INTO storage.buckets (id, name, public)
VALUES ('faturamento-docs', 'faturamento-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Política para leitura pública (clientes podem acessar via link)
CREATE POLICY "Leitura pública dos documentos de faturamento"
ON storage.objects FOR SELECT
USING (bucket_id = 'faturamento-docs');

-- Política para upload - apenas usuários autenticados
CREATE POLICY "Upload de documentos por usuários autenticados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'faturamento-docs' 
  AND auth.role() = 'authenticated'
);

-- Política para atualização - apenas usuários autenticados
CREATE POLICY "Atualização de documentos por usuários autenticados"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'faturamento-docs' 
  AND auth.role() = 'authenticated'
);

-- Política para exclusão - apenas usuários autenticados
CREATE POLICY "Exclusão de documentos por usuários autenticados"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'faturamento-docs' 
  AND auth.role() = 'authenticated'
);