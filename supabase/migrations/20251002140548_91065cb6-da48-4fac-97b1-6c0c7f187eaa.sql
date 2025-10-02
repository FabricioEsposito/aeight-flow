-- Remover tabelas antigas de contratos
DROP TABLE IF EXISTS contrato_itens CASCADE;
DROP TABLE IF EXISTS contas_receber CASCADE;
DROP TABLE IF EXISTS contas_pagar CASCADE;
DROP TABLE IF EXISTS contratos CASCADE;

-- Nova estrutura de contratos unificada
CREATE TABLE contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_contrato VARCHAR UNIQUE NOT NULL,
  tipo_contrato VARCHAR CHECK (tipo_contrato IN ('venda', 'compra')) NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  fornecedor_id UUID REFERENCES fornecedores(id),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  recorrente BOOLEAN DEFAULT false,
  periodo_recorrencia VARCHAR CHECK (periodo_recorrencia IN ('mensal', 'trimestral', 'semestral', 'anual')),
  plano_contas_id UUID REFERENCES plano_contas(id) NOT NULL,
  servicos JSONB,
  descricao_servico TEXT,
  quantidade DECIMAL NOT NULL DEFAULT 1,
  valor_unitario DECIMAL NOT NULL,
  desconto_tipo VARCHAR CHECK (desconto_tipo IN ('percentual', 'valor')),
  desconto_percentual DECIMAL DEFAULT 0,
  desconto_valor DECIMAL DEFAULT 0,
  irrf_percentual DECIMAL DEFAULT 0,
  pis_cofins_percentual DECIMAL DEFAULT 0,
  csll_percentual DECIMAL DEFAULT 0,
  tipo_pagamento VARCHAR NOT NULL,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) NOT NULL,
  valor_total DECIMAL NOT NULL,
  status VARCHAR DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de parcelas
CREATE TABLE parcelas_contrato (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor DECIMAL NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  tipo VARCHAR CHECK (tipo IN ('receber', 'pagar')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recriar contas_receber vinculada a parcelas
CREATE TABLE contas_receber (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parcela_id UUID REFERENCES parcelas_contrato(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) NOT NULL,
  valor DECIMAL NOT NULL,
  data_vencimento DATE NOT NULL,
  data_competencia DATE NOT NULL,
  data_recebimento DATE,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),
  plano_conta_id UUID REFERENCES plano_contas(id),
  status VARCHAR DEFAULT 'pendente',
  descricao VARCHAR NOT NULL,
  numero_nf VARCHAR,
  centro_custo VARCHAR,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recriar contas_pagar vinculada a parcelas
CREATE TABLE contas_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parcela_id UUID REFERENCES parcelas_contrato(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) NOT NULL,
  valor DECIMAL NOT NULL,
  data_vencimento DATE NOT NULL,
  data_competencia DATE NOT NULL,
  data_pagamento DATE,
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),
  plano_conta_id UUID REFERENCES plano_contas(id),
  status VARCHAR DEFAULT 'pendente',
  descricao VARCHAR NOT NULL,
  centro_custo VARCHAR,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations on contratos" ON contratos FOR ALL USING (true);
CREATE POLICY "Allow all operations on parcelas_contrato" ON parcelas_contrato FOR ALL USING (true);
CREATE POLICY "Allow all operations on contas_receber" ON contas_receber FOR ALL USING (true);
CREATE POLICY "Allow all operations on contas_pagar" ON contas_pagar FOR ALL USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contas_receber_updated_at
  BEFORE UPDATE ON contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contas_pagar_updated_at
  BEFORE UPDATE ON contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();