CREATE TABLE public.conferencias_nf (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conta_receber_id uuid NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE UNIQUE,
 link_nf text NOT NULL,
 documento_sha256 text NOT NULL,
 valor_bruto_pdf numeric,
 numero_nf_pdf text,
 cnpj_tomador_pdf text,
 evidencia text,
 status text NOT NULL,
 motivo text,
 conferido_por uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conferencias_nf TO authenticated;
GRANT ALL ON public.conferencias_nf TO service_role;
ALTER TABLE public.conferencias_nf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contador e gestores consultam conferencias" ON public.conferencias_nf FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','finance_manager','contador']::public.app_role[]));
CREATE TRIGGER update_conferencias_nf_updated_at BEFORE UPDATE ON public.conferencias_nf FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();