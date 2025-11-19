-- Expandir tabela de solicitações para incluir todos os ajustes
ALTER TABLE solicitacoes_alteracao_vencimento 
  RENAME TO solicitacoes_ajuste_financeiro;

-- Adicionar novas colunas para os ajustes
ALTER TABLE solicitacoes_ajuste_financeiro
  ADD COLUMN IF NOT EXISTS valor_original numeric,
  ADD COLUMN IF NOT EXISTS juros_atual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS juros_solicitado numeric,
  ADD COLUMN IF NOT EXISTS multa_atual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multa_solicitada numeric,
  ADD COLUMN IF NOT EXISTS desconto_atual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_solicitado numeric,
  ADD COLUMN IF NOT EXISTS plano_conta_id uuid,
  ADD COLUMN IF NOT EXISTS centro_custo varchar,
  ADD COLUMN IF NOT EXISTS conta_bancaria_id uuid;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_ajuste_financeiro(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_tipo ON solicitacoes_ajuste_financeiro(tipo_lancamento);