-- Add fornecedor_id column to vendedores table
ALTER TABLE public.vendedores 
ADD COLUMN fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_vendedores_fornecedor_id ON public.vendedores(fornecedor_id);