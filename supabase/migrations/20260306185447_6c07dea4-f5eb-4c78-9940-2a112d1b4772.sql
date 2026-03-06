
-- Fix existing residual entries: merge residual back into original, delete duplicate
-- For contas_receber residuals
WITH residual_receber AS (
  SELECT 
    hb.lancamento_id AS original_id,
    hb.lancamento_residual_id AS residual_id,
    hb.id AS historico_id
  FROM historico_baixas hb
  WHERE hb.lancamento_residual_id IS NOT NULL
    AND hb.tipo_lancamento = 'receber'
    AND EXISTS (SELECT 1 FROM contas_receber WHERE id = hb.lancamento_residual_id)
)
UPDATE contas_receber cr
SET 
  valor = residual.valor,
  data_vencimento = residual.data_vencimento,
  status = CASE WHEN residual.status = 'pendente' THEN 'pendente' ELSE residual.status END,
  data_recebimento = residual.data_recebimento,
  descricao = REPLACE(cr.descricao, ' (Residual)', '')
FROM (
  SELECT 
    rr.original_id,
    cr2.valor,
    cr2.data_vencimento,
    cr2.status,
    cr2.data_recebimento,
    cr2.id as residual_id
  FROM residual_receber rr
  JOIN contas_receber cr2 ON cr2.id = rr.residual_id
) residual
WHERE cr.id = residual.original_id;

-- Delete the residual contas_receber entries
DELETE FROM contas_receber 
WHERE id IN (
  SELECT hb.lancamento_residual_id 
  FROM historico_baixas hb 
  WHERE hb.lancamento_residual_id IS NOT NULL 
    AND hb.tipo_lancamento = 'receber'
    AND EXISTS (SELECT 1 FROM contas_receber WHERE id = hb.lancamento_residual_id)
);

-- For contas_pagar residuals
WITH residual_pagar AS (
  SELECT 
    hb.lancamento_id AS original_id,
    hb.lancamento_residual_id AS residual_id,
    hb.id AS historico_id
  FROM historico_baixas hb
  WHERE hb.lancamento_residual_id IS NOT NULL
    AND hb.tipo_lancamento = 'pagar'
    AND EXISTS (SELECT 1 FROM contas_pagar WHERE id = hb.lancamento_residual_id)
)
UPDATE contas_pagar cp
SET 
  valor = residual.valor,
  data_vencimento = residual.data_vencimento,
  status = CASE WHEN residual.status = 'pendente' THEN 'pendente' ELSE residual.status END,
  data_pagamento = residual.data_pagamento,
  descricao = REPLACE(cp.descricao, ' (Residual)', '')
FROM (
  SELECT 
    rp.original_id,
    cp2.valor,
    cp2.data_vencimento,
    cp2.status,
    cp2.data_pagamento,
    cp2.id as residual_id
  FROM residual_pagar rp
  JOIN contas_pagar cp2 ON cp2.id = rp.residual_id
) residual
WHERE cp.id = residual.original_id;

-- Delete the residual contas_pagar entries
DELETE FROM contas_pagar 
WHERE id IN (
  SELECT hb.lancamento_residual_id 
  FROM historico_baixas hb 
  WHERE hb.lancamento_residual_id IS NOT NULL 
    AND hb.tipo_lancamento = 'pagar'
    AND EXISTS (SELECT 1 FROM contas_pagar WHERE id = hb.lancamento_residual_id)
);

-- Clear lancamento_residual_id from historico_baixas since we no longer create separate entries
UPDATE historico_baixas SET lancamento_residual_id = NULL WHERE lancamento_residual_id IS NOT NULL;

-- Also clean up any remaining entries with (Residual) in the description that don't have historico_baixas records
-- These would be orphaned residual entries
