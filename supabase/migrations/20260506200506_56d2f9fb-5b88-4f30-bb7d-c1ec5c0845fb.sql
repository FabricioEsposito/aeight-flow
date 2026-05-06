
-- 1. Add new roles to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'prestador_servico';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'funcionario';

-- 2. Vinculos usuario-fornecedor
CREATE TABLE public.vinculos_usuario_fornecedor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fornecedor_id UUID,
  cnpj_cpf_solicitado TEXT,
  nome_solicitado TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('prestador_servico','funcionario')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  motivo_rejeicao TEXT,
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vinculos_user ON public.vinculos_usuario_fornecedor(user_id);
CREATE INDEX idx_vinculos_status ON public.vinculos_usuario_fornecedor(status);

ALTER TABLE public.vinculos_usuario_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own vinculo or admin sees all"
  ON public.vinculos_usuario_fornecedor FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own vinculo"
  ON public.vinculos_usuario_fornecedor FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admin updates vinculo"
  ON public.vinculos_usuario_fornecedor FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admin deletes vinculo"
  ON public.vinculos_usuario_fornecedor FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_vinculos_updated_at
  BEFORE UPDATE ON public.vinculos_usuario_fornecedor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Solicitacoes prestador (NF + reembolso)
CREATE TABLE public.solicitacoes_prestador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_id UUID NOT NULL,
  fornecedor_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('nf_mensal','reembolso')),
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT,
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  numero_nf TEXT,
  arquivo_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente_rh' CHECK (status IN (
    'pendente_rh','rejeitado_rh','aprovado_rh',
    'rejeitado_financeiro','aprovado_financeiro','pago'
  )),
  aprovador_rh_id UUID,
  data_aprovacao_rh TIMESTAMPTZ,
  motivo_rejeicao_rh TEXT,
  aprovador_financeiro_id UUID,
  data_aprovacao_financeiro TIMESTAMPTZ,
  motivo_rejeicao_financeiro TEXT,
  parcela_id UUID,
  conta_pagar_id UUID,
  folha_pagamento_id UUID,
  data_vencimento_pagamento DATE,
  conta_bancaria_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sol_prest_solicitante ON public.solicitacoes_prestador(solicitante_id);
CREATE INDEX idx_sol_prest_status ON public.solicitacoes_prestador(status);
CREATE INDEX idx_sol_prest_tipo ON public.solicitacoes_prestador(tipo);
CREATE INDEX idx_sol_prest_fornecedor ON public.solicitacoes_prestador(fornecedor_id);

ALTER TABLE public.solicitacoes_prestador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solicitante or staff can view"
  ON public.solicitacoes_prestador FOR SELECT
  USING (
    auth.uid() = solicitante_id
    OR has_any_role(auth.uid(), ARRAY['admin','rh_manager','rh_analyst','finance_manager','finance_analyst']::app_role[])
  );

CREATE POLICY "Solicitante creates own"
  ON public.solicitacoes_prestador FOR INSERT
  WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Staff updates solicitacoes"
  ON public.solicitacoes_prestador FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin','rh_manager','rh_analyst','finance_manager','finance_analyst']::app_role[])
  );

CREATE POLICY "Only admin deletes solicitacoes"
  ON public.solicitacoes_prestador FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sol_prest_updated_at
  BEFORE UPDATE ON public.solicitacoes_prestador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('prestador-docs', 'prestador-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — files saved as {user_id}/{filename}
CREATE POLICY "Prestador uploads own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prestador-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Prestador reads own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'prestador-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_any_role(auth.uid(), ARRAY['admin','rh_manager','rh_analyst','finance_manager','finance_analyst']::app_role[])
    )
  );

CREATE POLICY "Prestador updates own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'prestador-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admin deletes prestador files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'prestador-docs'
    AND has_role(auth.uid(), 'admin'::app_role)
  );
