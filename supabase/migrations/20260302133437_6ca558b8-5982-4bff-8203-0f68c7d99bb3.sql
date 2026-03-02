
-- Tabela para armazenar overrides de percentual de comissão por parcela
CREATE TABLE public.comissao_percentual_override (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_receber_id UUID NOT NULL,
  vendedor_id UUID NOT NULL REFERENCES public.vendedores(id),
  percentual_comissao NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(conta_receber_id, vendedor_id)
);

ALTER TABLE public.comissao_percentual_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comissao_percentual_override"
ON public.comissao_percentual_override FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comissao_percentual_override"
ON public.comissao_percentual_override FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update comissao_percentual_override"
ON public.comissao_percentual_override FOR UPDATE USING (true);

CREATE POLICY "Only admins can delete comissao_percentual_override"
ON public.comissao_percentual_override FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
