-- Cancelar contas a receber do contrato Futebol Card Shop (inativo)
UPDATE contas_receber 
SET status = 'cancelado', updated_at = now()
WHERE parcela_id IN (
  SELECT id FROM parcelas_contrato 
  WHERE contrato_id = '7887b8b3-ee1f-4fc4-bf37-56a1b640ce45'
)
AND status IN ('pendente', 'vencido');

-- Cancelar parcelas do contrato Futebol Card Shop (inativo)
UPDATE parcelas_contrato 
SET status = 'cancelado'
WHERE contrato_id = '7887b8b3-ee1f-4fc4-bf37-56a1b640ce45'
AND status IN ('pendente', 'vencido');