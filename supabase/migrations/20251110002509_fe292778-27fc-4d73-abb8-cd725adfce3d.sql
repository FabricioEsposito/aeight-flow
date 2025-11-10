-- Adicionar novo status 'aguardando_conclusao' à tabela parcelas_contrato
-- Primeiro, remover a constraint existente
ALTER TABLE public.parcelas_contrato 
DROP CONSTRAINT IF EXISTS parcelas_contrato_status_check;

-- Adicionar a nova constraint com o status adicional
ALTER TABLE public.parcelas_contrato 
ADD CONSTRAINT parcelas_contrato_status_check 
CHECK (status IN ('pendente', 'pago', 'cancelado', 'vencido', 'aguardando_conclusao'));