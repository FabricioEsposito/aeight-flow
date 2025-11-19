-- Criar enum para importância de clientes/fornecedores
CREATE TYPE public.importancia_nivel AS ENUM ('importante', 'mediano', 'nao_importante');

-- Adicionar coluna de importância na tabela contratos
ALTER TABLE public.contratos 
ADD COLUMN importancia_cliente_fornecedor importancia_nivel DEFAULT 'mediano';

-- Adicionar coluna de data_vencimento_original nas contas a receber
ALTER TABLE public.contas_receber 
ADD COLUMN data_vencimento_original date;

-- Adicionar coluna de data_vencimento_original nas contas a pagar
ALTER TABLE public.contas_pagar 
ADD COLUMN data_vencimento_original date;

-- Preencher data_vencimento_original com os valores atuais para registros existentes
UPDATE public.contas_receber 
SET data_vencimento_original = data_vencimento 
WHERE data_vencimento_original IS NULL;

UPDATE public.contas_pagar 
SET data_vencimento_original = data_vencimento 
WHERE data_vencimento_original IS NULL;

-- Criar tabela de solicitações de alteração de vencimento
CREATE TABLE public.solicitacoes_alteracao_vencimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_lancamento varchar NOT NULL CHECK (tipo_lancamento IN ('receber', 'pagar')),
  lancamento_id uuid NOT NULL,
  data_vencimento_atual date NOT NULL,
  data_vencimento_solicitada date NOT NULL,
  solicitante_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aprovador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status varchar NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  motivo_solicitacao text,
  motivo_rejeicao text,
  data_solicitacao timestamp with time zone NOT NULL DEFAULT now(),
  data_resposta timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de solicitações
ALTER TABLE public.solicitacoes_alteracao_vencimento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para solicitações de alteração
CREATE POLICY "Usuários podem criar suas próprias solicitações"
ON public.solicitacoes_alteracao_vencimento
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Usuários podem ver suas próprias solicitações"
ON public.solicitacoes_alteracao_vencimento
FOR SELECT
TO authenticated
USING (auth.uid() = solicitante_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar solicitações"
ON public.solicitacoes_alteracao_vencimento
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar solicitações"
ON public.solicitacoes_alteracao_vencimento
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Criar trigger para updated_at
CREATE TRIGGER update_solicitacoes_alteracao_vencimento_updated_at
BEFORE UPDATE ON public.solicitacoes_alteracao_vencimento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();