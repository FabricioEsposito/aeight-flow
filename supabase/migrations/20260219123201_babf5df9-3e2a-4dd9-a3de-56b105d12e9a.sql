
-- Sync plano_conta_id and conta_bancaria_id from contratos to contas_pagar
UPDATE contas_pagar cp
SET plano_conta_id = c.plano_contas_id,
    conta_bancaria_id = c.conta_bancaria_id
FROM parcelas_contrato pc
JOIN contratos c ON c.id = pc.contrato_id
WHERE cp.parcela_id = pc.id
  AND (cp.plano_conta_id IS DISTINCT FROM c.plano_contas_id
    OR cp.conta_bancaria_id IS DISTINCT FROM c.conta_bancaria_id);

-- Sync plano_conta_id and conta_bancaria_id from contratos to contas_receber
UPDATE contas_receber cr
SET plano_conta_id = c.plano_contas_id,
    conta_bancaria_id = c.conta_bancaria_id
FROM parcelas_contrato pc
JOIN contratos c ON c.id = pc.contrato_id
WHERE cr.parcela_id = pc.id
  AND (cr.plano_conta_id IS DISTINCT FROM c.plano_contas_id
    OR cr.conta_bancaria_id IS DISTINCT FROM c.conta_bancaria_id);
