-- Add numero_nf field to contas_receber table for invoice number tracking
ALTER TABLE public.contas_receber 
ADD COLUMN numero_nf character varying;

-- Add fornecedor_id field to contratos table to support supplier contracts
ALTER TABLE public.contratos 
ADD COLUMN fornecedor_id uuid REFERENCES public.fornecedores(id),
ADD COLUMN tipo_contrato character varying DEFAULT 'cliente' CHECK (tipo_contrato IN ('cliente', 'fornecedor'));

-- Make cliente_id nullable since we now have fornecedor_id
ALTER TABLE public.contratos 
ALTER COLUMN cliente_id DROP NOT NULL;