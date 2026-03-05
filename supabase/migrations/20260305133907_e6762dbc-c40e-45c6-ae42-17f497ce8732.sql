
-- Create junction table for license cost center allocation
CREATE TABLE public.ferramentas_licencas_centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licenca_id uuid NOT NULL REFERENCES public.ferramentas_software_licencas(id) ON DELETE CASCADE,
  centro_custo_id uuid NOT NULL REFERENCES public.centros_custo(id),
  percentual numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ferramentas_licencas_centros_custo ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as financial tables)
CREATE POLICY "Authenticated users can view ferramentas_licencas_cc"
  ON public.ferramentas_licencas_centros_custo FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create ferramentas_licencas_cc"
  ON public.ferramentas_licencas_centros_custo FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Finance roles can update ferramentas_licencas_cc"
  ON public.ferramentas_licencas_centros_custo FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));

CREATE POLICY "Finance roles can delete ferramentas_licencas_cc"
  ON public.ferramentas_licencas_centros_custo FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));

-- Updated_at trigger
CREATE TRIGGER update_ferramentas_licencas_cc_updated_at
  BEFORE UPDATE ON public.ferramentas_licencas_centros_custo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data: move centro_custo_id from licenses to the new table
INSERT INTO public.ferramentas_licencas_centros_custo (licenca_id, centro_custo_id, percentual)
SELECT id, centro_custo_id, 100
FROM public.ferramentas_software_licencas
WHERE centro_custo_id IS NOT NULL AND status = 'ativo';

-- Drop the old column
ALTER TABLE public.ferramentas_software_licencas DROP COLUMN IF EXISTS centro_custo_id;
