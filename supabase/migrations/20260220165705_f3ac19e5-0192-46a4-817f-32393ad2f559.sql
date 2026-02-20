
-- Tabela para persistir flags de meta batida por parcela
CREATE TABLE public.comissao_meta_batida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_receber_id UUID NOT NULL,
  vendedor_id UUID NOT NULL REFERENCES public.vendedores(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(conta_receber_id, vendedor_id)
);

ALTER TABLE public.comissao_meta_batida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comissao_meta_batida"
ON public.comissao_meta_batida FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comissao_meta_batida"
ON public.comissao_meta_batida FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can delete comissao_meta_batida"
ON public.comissao_meta_batida FOR DELETE USING (true);

-- Tabela para comissões extraordinárias avulsas
CREATE TABLE public.comissao_extraordinaria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID NOT NULL REFERENCES public.vendedores(id),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comissao_extraordinaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comissao_extraordinaria"
ON public.comissao_extraordinaria FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comissao_extraordinaria"
ON public.comissao_extraordinaria FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update comissao_extraordinaria"
ON public.comissao_extraordinaria FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete comissao_extraordinaria"
ON public.comissao_extraordinaria FOR DELETE USING (true);
