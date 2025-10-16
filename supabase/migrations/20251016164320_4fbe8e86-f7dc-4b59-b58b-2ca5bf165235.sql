-- Adicionar campos para salvar juros, multa e desconto nas parcelas de contas_receber e contas_pagar
ALTER TABLE public.contas_receber
ADD COLUMN IF NOT EXISTS juros numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_original numeric;

ALTER TABLE public.contas_pagar
ADD COLUMN IF NOT EXISTS juros numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS multa numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_original numeric;

-- Adicionar campo para separar PIS e COFINS no contrato
ALTER TABLE public.contratos
ADD COLUMN IF NOT EXISTS pis_percentual numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cofins_percentual numeric DEFAULT 0;

-- Migrar dados existentes de pis_cofins_percentual para os novos campos
UPDATE public.contratos
SET 
  pis_percentual = pis_cofins_percentual / 2,
  cofins_percentual = pis_cofins_percentual / 2
WHERE pis_cofins_percentual IS NOT NULL AND pis_cofins_percentual > 0;

-- Adicionar conta_bancaria_id nas parcelas_contrato
ALTER TABLE public.parcelas_contrato
ADD COLUMN IF NOT EXISTS conta_bancaria_id uuid REFERENCES public.contas_bancarias(id);

-- Atualizar foreign key de plano_contas para usar ON DELETE RESTRICT
-- Isso evita exclusão de contas que estão sendo usadas
ALTER TABLE public.plano_contas
DROP CONSTRAINT IF EXISTS plano_contas_parent_id_fkey;

ALTER TABLE public.plano_contas
ADD CONSTRAINT plano_contas_parent_id_fkey 
FOREIGN KEY (parent_id) 
REFERENCES public.plano_contas(id) 
ON DELETE RESTRICT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_receber_juros ON public.contas_receber(juros) WHERE juros > 0;
CREATE INDEX IF NOT EXISTS idx_contas_pagar_juros ON public.contas_pagar(juros) WHERE juros > 0;
CREATE INDEX IF NOT EXISTS idx_parcelas_contrato_conta_bancaria ON public.parcelas_contrato(conta_bancaria_id);