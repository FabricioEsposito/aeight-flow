-- =====================================================
-- Migração: Ajustar RLS para permitir baixas financeiras
-- Permite que finance_manager e finance_analyst possam
-- realizar operações de UPDATE em parcelas_contrato e movimentacoes
-- =====================================================

-- 1. PARCELAS_CONTRATO: Permitir UPDATE para roles financeiros
DROP POLICY IF EXISTS "Only admins can update parcelas_contrato" ON public.parcelas_contrato;

CREATE POLICY "Finance roles can update parcelas_contrato" 
ON public.parcelas_contrato
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['admin', 'finance_manager', 'finance_analyst']::app_role[])
);

-- 2. MOVIMENTACOES: Permitir UPDATE para roles financeiros
DROP POLICY IF EXISTS "Only admins can update movimentacoes" ON public.movimentacoes;

CREATE POLICY "Finance roles can update movimentacoes" 
ON public.movimentacoes
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['admin', 'finance_manager', 'finance_analyst']::app_role[])
);