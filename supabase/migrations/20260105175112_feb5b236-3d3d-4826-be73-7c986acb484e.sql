-- Adicionar campos link_nf e link_boleto na tabela contas_pagar
ALTER TABLE public.contas_pagar 
ADD COLUMN IF NOT EXISTS link_nf TEXT,
ADD COLUMN IF NOT EXISTS link_boleto TEXT;