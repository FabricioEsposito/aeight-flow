-- Criar tabela de centros de custo
CREATE TABLE public.centros_custo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo centro_custo_id na tabela contas_bancarias
ALTER TABLE public.contas_bancarias 
ADD COLUMN centro_custo_id UUID REFERENCES public.centros_custo(id);

-- Enable RLS
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
CREATE POLICY "Allow all operations on centros_custo"
ON public.centros_custo
FOR ALL
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_centros_custo_updated_at
BEFORE UPDATE ON public.centros_custo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();