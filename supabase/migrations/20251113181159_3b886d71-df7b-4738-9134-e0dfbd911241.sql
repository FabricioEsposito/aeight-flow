-- Remove the centro_custo_id column from contas_bancarias table
ALTER TABLE public.contas_bancarias 
DROP COLUMN IF EXISTS centro_custo_id;