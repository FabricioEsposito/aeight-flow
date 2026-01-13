-- Criar tabela para histórico de baixas parciais
CREATE TABLE public.historico_baixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id UUID NOT NULL,
  tipo_lancamento VARCHAR NOT NULL, -- 'receber' ou 'pagar'
  valor_baixa NUMERIC NOT NULL,
  data_baixa DATE NOT NULL,
  valor_restante NUMERIC NOT NULL,
  lancamento_residual_id UUID, -- ID do lançamento residual criado (se houver)
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.historico_baixas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view historico_baixas" 
ON public.historico_baixas 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create historico_baixas" 
ON public.historico_baixas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admins can delete historico_baixas" 
ON public.historico_baixas 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_historico_baixas_lancamento ON public.historico_baixas(lancamento_id);
CREATE INDEX idx_historico_baixas_residual ON public.historico_baixas(lancamento_residual_id);