-- Adicionar coluna para armazenar o valor bruto do contrato (antes de descontos e impostos)
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS valor_bruto numeric DEFAULT 0;

-- Atualizar contratos existentes para calcular o valor bruto
UPDATE public.contratos
SET valor_bruto = quantidade * valor_unitario
WHERE valor_bruto = 0 OR valor_bruto IS NULL;