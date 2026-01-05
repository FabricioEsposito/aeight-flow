-- Add link_boleto column to contas_receber table
ALTER TABLE public.contas_receber 
ADD COLUMN link_boleto TEXT;