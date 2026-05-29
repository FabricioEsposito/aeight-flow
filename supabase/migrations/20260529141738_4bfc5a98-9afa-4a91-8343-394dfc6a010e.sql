
-- 1) contas_receber: onde parcela.valor == cr.valor e há retenção, converte parcela.valor para BRUTO
WITH tax AS (
  SELECT id,
    (COALESCE(irrf_percentual,0)+COALESCE(pis_percentual,0)+COALESCE(cofins_percentual,0)+COALESCE(csll_percentual,0))/100.0 AS tax_rate
  FROM contratos
),
to_fix AS (
  SELECT pc.id AS parcela_id, cr.id AS cr_id, pc.valor AS old_valor, t.tax_rate
  FROM parcelas_contrato pc
  JOIN tax t ON t.id = pc.contrato_id
  JOIN contas_receber cr ON cr.parcela_id = pc.id
  WHERE t.tax_rate > 0 AND pc.valor = cr.valor
)
UPDATE parcelas_contrato pc
SET valor = ROUND((tf.old_valor / (1 - tf.tax_rate))::numeric, 2)
FROM to_fix tf
WHERE pc.id = tf.parcela_id;

-- Atualiza valor_original de contas_receber para refletir o bruto
WITH tax AS (
  SELECT id,
    (COALESCE(irrf_percentual,0)+COALESCE(pis_percentual,0)+COALESCE(cofins_percentual,0)+COALESCE(csll_percentual,0))/100.0 AS tax_rate
  FROM contratos
)
UPDATE contas_receber cr
SET valor_original = ROUND((cr.valor / (1 - t.tax_rate))::numeric, 2)
FROM parcelas_contrato pc
JOIN tax t ON t.id = pc.contrato_id
WHERE cr.parcela_id = pc.id
  AND t.tax_rate > 0
  AND cr.valor_original IS DISTINCT FROM ROUND((cr.valor / (1 - t.tax_rate))::numeric, 2)
  AND cr.valor_original = cr.valor;

-- 2) contas_pagar (mesma lógica)
WITH tax AS (
  SELECT id,
    (COALESCE(irrf_percentual,0)+COALESCE(pis_percentual,0)+COALESCE(cofins_percentual,0)+COALESCE(csll_percentual,0))/100.0 AS tax_rate
  FROM contratos
),
to_fix AS (
  SELECT pc.id AS parcela_id, cp.id AS cp_id, pc.valor AS old_valor, t.tax_rate
  FROM parcelas_contrato pc
  JOIN tax t ON t.id = pc.contrato_id
  JOIN contas_pagar cp ON cp.parcela_id = pc.id
  WHERE t.tax_rate > 0 AND pc.valor = cp.valor
)
UPDATE parcelas_contrato pc
SET valor = ROUND((tf.old_valor / (1 - tf.tax_rate))::numeric, 2)
FROM to_fix tf
WHERE pc.id = tf.parcela_id;

WITH tax AS (
  SELECT id,
    (COALESCE(irrf_percentual,0)+COALESCE(pis_percentual,0)+COALESCE(cofins_percentual,0)+COALESCE(csll_percentual,0))/100.0 AS tax_rate
  FROM contratos
)
UPDATE contas_pagar cp
SET valor_original = ROUND((cp.valor / (1 - t.tax_rate))::numeric, 2)
FROM parcelas_contrato pc
JOIN tax t ON t.id = pc.contrato_id
WHERE cp.parcela_id = pc.id
  AND t.tax_rate > 0
  AND cp.valor_original IS DISTINCT FROM ROUND((cp.valor / (1 - t.tax_rate))::numeric, 2)
  AND cp.valor_original = cp.valor;
