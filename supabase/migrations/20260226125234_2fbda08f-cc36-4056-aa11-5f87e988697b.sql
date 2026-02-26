
-- Tabela folha_pagamento
CREATE TABLE public.folha_pagamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  contrato_id uuid REFERENCES public.contratos(id),
  parcela_id uuid REFERENCES public.parcelas_contrato(id),
  conta_pagar_id uuid REFERENCES public.contas_pagar(id),
  mes_referencia integer NOT NULL,
  ano_referencia integer NOT NULL,
  tipo_vinculo character varying NOT NULL DEFAULT 'PJ',
  salario_base numeric NOT NULL DEFAULT 0,
  -- CLT fields
  inss_percentual numeric NOT NULL DEFAULT 0,
  inss_valor numeric NOT NULL DEFAULT 0,
  fgts_percentual numeric NOT NULL DEFAULT 0,
  fgts_valor numeric NOT NULL DEFAULT 0,
  irrf_percentual numeric NOT NULL DEFAULT 0,
  irrf_valor numeric NOT NULL DEFAULT 0,
  vale_transporte_desconto numeric NOT NULL DEFAULT 0,
  outros_descontos numeric NOT NULL DEFAULT 0,
  outros_proventos numeric NOT NULL DEFAULT 0,
  -- PJ fields
  iss_percentual numeric NOT NULL DEFAULT 0,
  iss_valor numeric NOT NULL DEFAULT 0,
  pis_percentual numeric NOT NULL DEFAULT 0,
  pis_valor numeric NOT NULL DEFAULT 0,
  cofins_percentual numeric NOT NULL DEFAULT 0,
  cofins_valor numeric NOT NULL DEFAULT 0,
  csll_percentual numeric NOT NULL DEFAULT 0,
  csll_valor numeric NOT NULL DEFAULT 0,
  irrf_pj_percentual numeric NOT NULL DEFAULT 0,
  irrf_pj_valor numeric NOT NULL DEFAULT 0,
  -- Common
  valor_liquido numeric NOT NULL DEFAULT 0,
  observacoes text,
  status character varying NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Tabela controle_beneficios
CREATE TABLE public.controle_beneficios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  contrato_id uuid REFERENCES public.contratos(id),
  parcela_id uuid REFERENCES public.parcelas_contrato(id),
  conta_pagar_id uuid REFERENCES public.contas_pagar(id),
  mes_referencia integer NOT NULL,
  ano_referencia integer NOT NULL,
  tipo_beneficio character varying NOT NULL DEFAULT 'Outros',
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  observacoes text,
  status character varying NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- RLS folha_pagamento
ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view folha_pagamento"
  ON public.folha_pagamento FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create folha_pagamento"
  ON public.folha_pagamento FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Finance roles can update folha_pagamento"
  ON public.folha_pagamento FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role]));

CREATE POLICY "Only admins can delete folha_pagamento"
  ON public.folha_pagamento FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS controle_beneficios
ALTER TABLE public.controle_beneficios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view controle_beneficios"
  ON public.controle_beneficios FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create controle_beneficios"
  ON public.controle_beneficios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Finance roles can update controle_beneficios"
  ON public.controle_beneficios FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role]));

CREATE POLICY "Only admins can delete controle_beneficios"
  ON public.controle_beneficios FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers updated_at
CREATE TRIGGER update_folha_pagamento_updated_at
  BEFORE UPDATE ON public.folha_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_controle_beneficios_updated_at
  BEFORE UPDATE ON public.controle_beneficios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
