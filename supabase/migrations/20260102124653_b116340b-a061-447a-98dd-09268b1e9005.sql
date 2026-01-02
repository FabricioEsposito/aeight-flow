-- Adicionar coluna para percentual de investimento em mídia
ALTER TABLE public.contratos
ADD COLUMN percentual_investimento_midia numeric DEFAULT 0;