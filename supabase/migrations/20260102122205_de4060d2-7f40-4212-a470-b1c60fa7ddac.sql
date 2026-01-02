-- Deletar registros órfãos em contas_receber (sem parcela_id vinculado)
DELETE FROM public.contas_receber 
WHERE parcela_id IS NULL;

-- Deletar registros órfãos em contas_pagar (sem parcela_id vinculado)
DELETE FROM public.contas_pagar 
WHERE parcela_id IS NULL;

-- Adicionar constraint NOT NULL em parcela_id para contas_receber
-- Primeiro, garantir que não há valores NULL restantes
ALTER TABLE public.contas_receber 
ALTER COLUMN parcela_id SET NOT NULL;

-- Adicionar constraint NOT NULL em parcela_id para contas_pagar
ALTER TABLE public.contas_pagar 
ALTER COLUMN parcela_id SET NOT NULL;