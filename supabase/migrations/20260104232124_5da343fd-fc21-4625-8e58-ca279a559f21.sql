-- Adicionar campo de observações de faturamento na tabela de contratos
ALTER TABLE public.contratos 
ADD COLUMN observacoes_faturamento TEXT NULL;