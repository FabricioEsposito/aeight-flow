-- Add link_nf column to contas_receber table
ALTER TABLE public.contas_receber 
ADD COLUMN link_nf text;

-- Add comment for documentation
COMMENT ON COLUMN public.contas_receber.link_nf IS 'Link para a Nota Fiscal';