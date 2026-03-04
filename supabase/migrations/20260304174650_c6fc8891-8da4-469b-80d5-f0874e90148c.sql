
-- Table for multi-center cost allocation on individual financial entries
CREATE TABLE public.lancamentos_centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_pagar_id UUID REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  centro_custo_id UUID NOT NULL REFERENCES public.centros_custo(id),
  percentual NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.lancamentos_centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lancamentos_centros_custo"
ON public.lancamentos_centros_custo FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create lancamentos_centros_custo"
ON public.lancamentos_centros_custo FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Finance roles can update lancamentos_centros_custo"
ON public.lancamentos_centros_custo FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','finance_manager','finance_analyst']::app_role[]));

CREATE POLICY "Finance roles can delete lancamentos_centros_custo"
ON public.lancamentos_centros_custo FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','finance_manager','finance_analyst']::app_role[]));
