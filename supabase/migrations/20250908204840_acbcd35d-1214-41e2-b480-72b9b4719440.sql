-- Create enum types for better data integrity
CREATE TYPE pessoa_tipo AS ENUM ('fisica', 'juridica');
CREATE TYPE conta_tipo AS ENUM ('corrente', 'poupanca', 'investimento');
CREATE TYPE status_geral AS ENUM ('ativo', 'inativo');
CREATE TYPE status_contrato AS ENUM ('ativo', 'encerrado', 'suspenso');
CREATE TYPE status_pagamento AS ENUM ('pendente', 'pago', 'vencido', 'cancelado');
CREATE TYPE tipo_movimentacao AS ENUM ('entrada', 'saida');

-- Clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_pessoa pessoa_tipo NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj_cpf VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  cep VARCHAR(10),
  endereco TEXT,
  numero VARCHAR(20),
  complemento TEXT,
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  status status_geral NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fornecedores table (mesma estrutura dos clientes)
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_pessoa pessoa_tipo NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj_cpf VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  cep VARCHAR(10),
  endereco TEXT,
  numero VARCHAR(20),
  complemento TEXT,
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  status status_geral NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Serviços table
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  centro_custo VARCHAR(100),
  status status_geral NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contas bancárias table
CREATE TABLE public.contas_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_conta conta_tipo NOT NULL,
  banco VARCHAR(100) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(15,2) NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL,
  status status_geral NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plano de contas table
CREATE TABLE public.plano_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  nivel INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.plano_contas(id),
  tipo tipo_movimentacao NOT NULL,
  status status_geral NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contratos table
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(50) UNIQUE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_bruto DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  desconto_valor DECIMAL(15,2) NOT NULL DEFAULT 0,
  irrf DECIMAL(15,2) NOT NULL DEFAULT 0,
  pis DECIMAL(15,2) NOT NULL DEFAULT 0,
  cofins DECIMAL(15,2) NOT NULL DEFAULT 0,
  csll DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_liquido DECIMAL(15,2) NOT NULL DEFAULT 0,
  categoria VARCHAR(100),
  centro_custo VARCHAR(100),
  tipo_pagamento VARCHAR(50),
  conta_recebimento_id UUID REFERENCES public.contas_bancarias(id),
  dia_vencimento INTEGER,
  recorrencia BOOLEAN NOT NULL DEFAULT false,
  periodo_recorrencia VARCHAR(20),
  status status_contrato NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens do contrato table
CREATE TABLE public.contrato_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES public.servicos(id),
  descricao VARCHAR(255) NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
  valor_unitario DECIMAL(15,2) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contas a receber table
CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_competencia DATE NOT NULL,
  data_recebimento DATE,
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  plano_conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo VARCHAR(100),
  observacoes TEXT,
  status status_pagamento NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contas a pagar table
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_competencia DATE NOT NULL,
  data_pagamento DATE,
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  plano_conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo VARCHAR(100),
  observacoes TEXT,
  status status_pagamento NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Movimentações financeiras table
CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id),
  tipo tipo_movimentacao NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_movimento DATE NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  plano_conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo VARCHAR(100),
  conta_receber_id UUID REFERENCES public.contas_receber(id),
  conta_pagar_id UUID REFERENCES public.contas_pagar(id),
  conciliado BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now - will need authentication later)
CREATE POLICY "Allow all operations on clientes" ON public.clientes FOR ALL USING (true);
CREATE POLICY "Allow all operations on fornecedores" ON public.fornecedores FOR ALL USING (true);
CREATE POLICY "Allow all operations on servicos" ON public.servicos FOR ALL USING (true);
CREATE POLICY "Allow all operations on contas_bancarias" ON public.contas_bancarias FOR ALL USING (true);
CREATE POLICY "Allow all operations on plano_contas" ON public.plano_contas FOR ALL USING (true);
CREATE POLICY "Allow all operations on contratos" ON public.contratos FOR ALL USING (true);
CREATE POLICY "Allow all operations on contrato_itens" ON public.contrato_itens FOR ALL USING (true);
CREATE POLICY "Allow all operations on contas_receber" ON public.contas_receber FOR ALL USING (true);
CREATE POLICY "Allow all operations on contas_pagar" ON public.contas_pagar FOR ALL USING (true);
CREATE POLICY "Allow all operations on movimentacoes" ON public.movimentacoes FOR ALL USING (true);

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers to all tables
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plano_contas_updated_at BEFORE UPDATE ON public.plano_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contrato_itens_updated_at BEFORE UPDATE ON public.contrato_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_pagar_updated_at BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public update_contas_pagar_updated_at();
CREATE TRIGGER update_movimentacoes_updated_at BEFORE UPDATE ON public.movimentacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial data for plano de contas
INSERT INTO public.plano_contas (codigo, descricao, nivel, tipo) VALUES 
('1', 'RECEITAS', 1, 'entrada'),
('1.1', 'Receita de Serviços', 2, 'entrada'),
('1.1.1', 'Recebimento de Clientes', 3, 'entrada'),
('2', 'DESPESAS', 1, 'saida'),
('2.1', 'Despesas Operacionais', 2, 'saida'),
('2.1.1', 'Fornecedores', 3, 'saida'),
('2.1.2', 'Impostos e Taxas', 3, 'saida'),
('2.2', 'Despesas Administrativas', 2, 'saida'),
('2.2.1', 'Material de Escritório', 3, 'saida'),
('2.2.2', 'Telefone e Internet', 3, 'saida');

-- Update parent_id for hierarchical structure
UPDATE public.plano_contas SET parent_id = (SELECT id FROM public.plano_contas WHERE codigo = '1') WHERE codigo IN ('1.1');
UPDATE public.plano_contas SET parent_id = (SELECT id FROM public.plano_contas WHERE codigo = '1.1') WHERE codigo IN ('1.1.1');
UPDATE public.plano_contas SET parent_id = (SELECT id FROM public.plano_contas WHERE codigo = '2') WHERE codigo IN ('2.1', '2.2');
UPDATE public.plano_contas SET parent_id = (SELECT id FROM public.plano_contas WHERE codigo = '2.1') WHERE codigo IN ('2.1.1', '2.1.2');
UPDATE public.plano_contas SET parent_id = (SELECT id FROM public.plano_contas WHERE codigo = '2.2') WHERE codigo IN ('2.2.1', '2.2.2');

-- Create function to update saldo_atual in contas_bancarias
CREATE OR REPLACE FUNCTION public.update_conta_saldo()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'entrada' THEN
      UPDATE public.contas_bancarias 
      SET saldo_atual = saldo_atual + NEW.valor 
      WHERE id = NEW.conta_bancaria_id;
    ELSE
      UPDATE public.contas_bancarias 
      SET saldo_atual = saldo_atual - NEW.valor 
      WHERE id = NEW.conta_bancaria_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.tipo = 'entrada' THEN
      UPDATE public.contas_bancarias 
      SET saldo_atual = saldo_atual - OLD.valor 
      WHERE id = OLD.conta_bancaria_id;
    ELSE
      UPDATE public.contas_bancarias 
      SET saldo_atual = saldo_atual + OLD.valor 
      WHERE id = OLD.conta_bancaria_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to update saldo automatically
CREATE TRIGGER update_saldo_conta_bancaria
  AFTER INSERT OR DELETE ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_conta_saldo();