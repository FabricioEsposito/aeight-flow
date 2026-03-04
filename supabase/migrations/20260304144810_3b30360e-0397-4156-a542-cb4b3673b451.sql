
-- 2. Create approval requests table for RH
CREATE TABLE IF NOT EXISTS public.solicitacoes_aprovacao_rh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pendente',
  tipo VARCHAR NOT NULL DEFAULT 'importacao',
  descricao TEXT,
  detalhes JSONB,
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  aprovador_rh_id UUID,
  data_aprovacao_rh TIMESTAMPTZ,
  aprovador_financeiro_id UUID,
  data_aprovacao_financeiro TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_aprovacao_rh ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view solicitacoes_aprovacao_rh"
ON public.solicitacoes_aprovacao_rh FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can create solicitacoes_aprovacao_rh"
ON public.solicitacoes_aprovacao_rh FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "RH managers admins finance can update solicitacoes_aprovacao_rh"
ON public.solicitacoes_aprovacao_rh FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','rh_manager','finance_manager']::app_role[]));

-- 3. Add solicitacao_rh_id column to folha_pagamento
ALTER TABLE public.folha_pagamento ADD COLUMN IF NOT EXISTS solicitacao_rh_id UUID;

-- 4. Update folha_pagamento RLS to allow rh_manager and rh_analyst to update
DROP POLICY IF EXISTS "Finance roles can update folha_pagamento" ON public.folha_pagamento;
CREATE POLICY "Finance and RH roles can update folha_pagamento"
ON public.folha_pagamento FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'rh_manager'::app_role, 'rh_analyst'::app_role]));

-- 5. Update notificacoes RLS to allow RH managers to create notifications
DROP POLICY IF EXISTS "Admins podem criar notificações" ON public.notificacoes;
CREATE POLICY "Admins and RH managers can create notifications"
ON public.notificacoes FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_manager'::app_role, 'finance_manager'::app_role]));

-- 6. Updated_at trigger for solicitacoes_aprovacao_rh
CREATE TRIGGER update_solicitacoes_aprovacao_rh_updated_at
  BEFORE UPDATE ON public.solicitacoes_aprovacao_rh
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
