
-- Nova tabela de rateio de centros de custo por contrato
CREATE TABLE public.contratos_centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  centro_custo_id uuid NOT NULL REFERENCES public.centros_custo(id),
  percentual numeric NOT NULL DEFAULT 100,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint para evitar duplicatas
ALTER TABLE public.contratos_centros_custo ADD CONSTRAINT unique_contrato_centro_custo UNIQUE (contrato_id, centro_custo_id);

-- Enable RLS
ALTER TABLE public.contratos_centros_custo ENABLE ROW LEVEL SECURITY;

-- RLS Policies alinhadas com contratos
CREATE POLICY "Authenticated users can view contratos_centros_custo"
ON public.contratos_centros_custo FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create contratos_centros_custo"
ON public.contratos_centros_custo FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update contratos_centros_custo"
ON public.contratos_centros_custo FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete contratos_centros_custo"
ON public.contratos_centros_custo FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_contratos_centros_custo_updated_at
BEFORE UPDATE ON public.contratos_centros_custo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar dados existentes: contratos com centro_custo preenchido vão para a nova tabela com 100%
INSERT INTO public.contratos_centros_custo (contrato_id, centro_custo_id, percentual, valor)
SELECT c.id, cc.id, 100, c.valor_total
FROM public.contratos c
JOIN public.centros_custo cc ON cc.id::text = c.centro_custo
WHERE c.centro_custo IS NOT NULL AND c.centro_custo != '';
