-- Adicionar campo data_reativacao na tabela contratos
ALTER TABLE public.contratos
ADD COLUMN data_reativacao date DEFAULT NULL;