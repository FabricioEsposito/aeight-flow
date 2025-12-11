-- Add nome_fantasia column to clientes table
ALTER TABLE public.clientes
ADD COLUMN nome_fantasia text;

-- Add nome_fantasia column to fornecedores table
ALTER TABLE public.fornecedores
ADD COLUMN nome_fantasia text;