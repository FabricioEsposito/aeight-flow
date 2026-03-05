
CREATE TABLE public.ferramentas_licencas_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferramenta_id uuid NOT NULL REFERENCES public.ferramentas_software(id) ON DELETE CASCADE,
  mes_referencia integer NOT NULL,
  ano_referencia integer NOT NULL,
  data_pagamento timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ferramenta_id, mes_referencia, ano_referencia)
);

ALTER TABLE public.ferramentas_licencas_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ferramentas_licencas_pagamentos"
  ON public.ferramentas_licencas_pagamentos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create ferramentas_licencas_pagamentos"
  ON public.ferramentas_licencas_pagamentos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Finance roles can delete ferramentas_licencas_pagamentos"
  ON public.ferramentas_licencas_pagamentos FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));
