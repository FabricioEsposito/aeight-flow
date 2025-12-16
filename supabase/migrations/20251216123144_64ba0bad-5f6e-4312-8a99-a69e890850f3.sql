-- Criar tabela de vendedores
CREATE TABLE public.vendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  centro_custo character varying,
  meta numeric NOT NULL DEFAULT 0,
  percentual_comissao numeric NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'ativo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view vendedores"
ON public.vendedores FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create vendedores"
ON public.vendedores FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can update vendedores"
ON public.vendedores FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete vendedores"
ON public.vendedores FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_vendedores_updated_at
BEFORE UPDATE ON public.vendedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de solicitações de comissão
CREATE TABLE public.solicitacoes_comissao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
  solicitante_id uuid NOT NULL,
  mes_referencia integer NOT NULL,
  ano_referencia integer NOT NULL,
  valor_total_vendas numeric NOT NULL DEFAULT 0,
  valor_comissao numeric NOT NULL DEFAULT 0,
  percentual_comissao numeric NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'pendente',
  aprovador_id uuid,
  data_aprovacao timestamp with time zone,
  motivo_rejeicao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solicitacoes_comissao ENABLE ROW LEVEL SECURITY;

-- Policies para solicitações de comissão
CREATE POLICY "Users can view their own commission requests or admins can view all"
ON public.solicitacoes_comissao FOR SELECT
USING ((auth.uid() = solicitante_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own commission requests"
ON public.solicitacoes_comissao FOR INSERT
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Only admins can update commission requests"
ON public.solicitacoes_comissao FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete commission requests"
ON public.solicitacoes_comissao FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_solicitacoes_comissao_updated_at
BEFORE UPDATE ON public.solicitacoes_comissao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();