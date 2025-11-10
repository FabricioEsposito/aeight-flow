-- Adicionar colunas centro_custo e vendedor_responsavel à tabela contratos
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS centro_custo character varying,
ADD COLUMN IF NOT EXISTS vendedor_responsavel character varying;