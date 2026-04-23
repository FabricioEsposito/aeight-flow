-- Tabela de extratos importados
CREATE TABLE public.extratos_importados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_bancaria_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  total_transacoes INTEGER NOT NULL DEFAULT 0,
  total_conciliadas INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extratos_importados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view extratos_importados"
  ON public.extratos_importados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance roles can insert extratos_importados"
  ON public.extratos_importados FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));

CREATE POLICY "Finance roles can update extratos_importados"
  ON public.extratos_importados FOR UPDATE
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));

CREATE POLICY "Only admins can delete extratos_importados"
  ON public.extratos_importados FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_extratos_importados_conta ON public.extratos_importados(conta_bancaria_id);
CREATE INDEX idx_extratos_importados_created_at ON public.extratos_importados(created_at DESC);

-- Tabela de transações de extrato
CREATE TABLE public.extrato_transacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extrato_importado_id UUID NOT NULL REFERENCES public.extratos_importados(id) ON DELETE CASCADE,
  fitid TEXT,
  data_movimento DATE NOT NULL,
  valor NUMERIC NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'conciliado', 'ignorado')),
  conta_receber_id UUID,
  conta_pagar_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extrato_transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view extrato_transacoes"
  ON public.extrato_transacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance roles can insert extrato_transacoes"
  ON public.extrato_transacoes FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));

CREATE POLICY "Finance roles can update extrato_transacoes"
  ON public.extrato_transacoes FOR UPDATE
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'finance_manager'::app_role, 'finance_analyst'::app_role]));

CREATE POLICY "Only admins can delete extrato_transacoes"
  ON public.extrato_transacoes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_extrato_transacoes_extrato ON public.extrato_transacoes(extrato_importado_id);
CREATE INDEX idx_extrato_transacoes_status ON public.extrato_transacoes(status);
CREATE UNIQUE INDEX idx_extrato_transacoes_fitid_unique
  ON public.extrato_transacoes(extrato_importado_id, fitid)
  WHERE fitid IS NOT NULL;