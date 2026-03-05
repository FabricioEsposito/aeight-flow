
-- Create ferramentas_software table
CREATE TABLE public.ferramentas_software (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome character varying NOT NULL,
  descricao text,
  centro_custo_id uuid REFERENCES public.centros_custo(id) NOT NULL,
  valor_mensal numeric NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'ativo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ferramentas_software_licencas table
CREATE TABLE public.ferramentas_software_licencas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ferramenta_id uuid REFERENCES public.ferramentas_software(id) ON DELETE CASCADE NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) NOT NULL,
  descricao_usuario text,
  valor_licenca numeric NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'ativo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ferramentas_software ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas_software_licencas ENABLE ROW LEVEL SECURITY;

-- RLS for ferramentas_software
CREATE POLICY "Authenticated users can view ferramentas_software" ON public.ferramentas_software FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create ferramentas_software" ON public.ferramentas_software FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Finance roles can update ferramentas_software" ON public.ferramentas_software FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));
CREATE POLICY "Only admins can delete ferramentas_software" ON public.ferramentas_software FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for ferramentas_software_licencas
CREATE POLICY "Authenticated users can view ferramentas_software_licencas" ON public.ferramentas_software_licencas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create ferramentas_software_licencas" ON public.ferramentas_software_licencas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Finance roles can update ferramentas_software_licencas" ON public.ferramentas_software_licencas FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));
CREATE POLICY "Only admins can delete ferramentas_software_licencas" ON public.ferramentas_software_licencas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_ferramentas_software_updated_at BEFORE UPDATE ON public.ferramentas_software FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ferramentas_software_licencas_updated_at BEFORE UPDATE ON public.ferramentas_software_licencas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
