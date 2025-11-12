-- Atualizar data_competencia em contas_receber baseado no número da parcela e recorrência
UPDATE contas_receber
SET data_competencia = (
  SELECT 
    CASE 
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'mensal' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) || ' months')::interval)::date
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'trimestral' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) * 3 || ' months')::interval)::date
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'semestral' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) * 6 || ' months')::interval)::date
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'anual' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) * 12 || ' months')::interval)::date
      ELSE
        -- Para vendas avulsas ou compras, usar parcela como meses também
        (c.data_inicio + ((pc.numero_parcela - 1) || ' months')::interval)::date
    END
  FROM parcelas_contrato pc
  JOIN contratos c ON pc.contrato_id = c.id
  WHERE pc.id = contas_receber.parcela_id
)
WHERE parcela_id IS NOT NULL;

-- Atualizar data_competencia em contas_pagar baseado no número da parcela e recorrência
UPDATE contas_pagar
SET data_competencia = (
  SELECT 
    CASE 
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'mensal' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) || ' months')::interval)::date
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'trimestral' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) * 3 || ' months')::interval)::date
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'semestral' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) * 6 || ' months')::interval)::date
      WHEN c.recorrente = true AND c.periodo_recorrencia = 'anual' THEN
        (c.data_inicio + ((pc.numero_parcela - 1) * 12 || ' months')::interval)::date
      ELSE
        -- Para vendas avulsas ou compras, usar parcela como meses também
        (c.data_inicio + ((pc.numero_parcela - 1) || ' months')::interval)::date
    END
  FROM parcelas_contrato pc
  JOIN contratos c ON pc.contrato_id = c.id
  WHERE pc.id = contas_pagar.parcela_id
)
WHERE parcela_id IS NOT NULL;