
ALTER TABLE public.solicitacoes_prestador
  ADD COLUMN IF NOT EXISTS aprovador_rh_analista_id uuid,
  ADD COLUMN IF NOT EXISTS data_aprovacao_rh_analista timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao_rh_analista text,
  ADD COLUMN IF NOT EXISTS aprovador_rh_gerente_id uuid,
  ADD COLUMN IF NOT EXISTS data_aprovacao_rh_gerente timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao_rh_gerente text;

ALTER TABLE public.solicitacoes_prestador DROP CONSTRAINT IF EXISTS solicitacoes_prestador_status_check;
ALTER TABLE public.solicitacoes_prestador ADD CONSTRAINT solicitacoes_prestador_status_check
  CHECK (status IN (
    'pendente_lider','aprovado_lider','rejeitado_lider',
    'pendente_rh','pendente_rh_analista','pendente_rh_gerente','aprovado_rh','rejeitado_rh','rejeitado_rh_analista','rejeitado_rh_gerente',
    'pendente_financeiro','aprovado_financeiro','rejeitado_financeiro'
  ));

UPDATE public.solicitacoes_prestador SET status = 'pendente_rh_analista' WHERE status = 'pendente_rh';
UPDATE public.solicitacoes_prestador
  SET status = 'pendente_financeiro',
      aprovador_rh_gerente_id = COALESCE(aprovador_rh_gerente_id, aprovador_rh_id),
      data_aprovacao_rh_gerente = COALESCE(data_aprovacao_rh_gerente, data_aprovacao_rh)
  WHERE status = 'aprovado_rh';
