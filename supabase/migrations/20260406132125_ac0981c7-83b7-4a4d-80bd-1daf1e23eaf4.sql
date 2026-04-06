
-- Create private bucket for accountant documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contador-docs', 'contador-docs', false);

-- Storage RLS: SELECT for admin, finance_manager, finance_analyst, contador
CREATE POLICY "Contador docs select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'contador-docs'
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role, 'contador'::app_role])
);

-- Storage RLS: INSERT for admin, finance_manager, finance_analyst
CREATE POLICY "Contador docs insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contador-docs'
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role])
);

-- Storage RLS: DELETE for admin, finance_manager, finance_analyst
CREATE POLICY "Contador docs delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'contador-docs'
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role])
);

-- Create metadata table
CREATE TABLE public.contador_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  conta_bancaria_id uuid REFERENCES public.contas_bancarias(id),
  mes_referencia integer NOT NULL,
  ano_referencia integer NOT NULL,
  descricao text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contador_documentos ENABLE ROW LEVEL SECURITY;

-- SELECT: admin, finance_manager, finance_analyst, contador
CREATE POLICY "Contador documentos select" ON public.contador_documentos
FOR SELECT TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role, 'contador'::app_role])
);

-- INSERT: admin, finance_manager, finance_analyst
CREATE POLICY "Contador documentos insert" ON public.contador_documentos
FOR INSERT TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role])
);

-- DELETE: admin, finance_manager
CREATE POLICY "Contador documentos delete" ON public.contador_documentos
FOR DELETE TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role])
);
