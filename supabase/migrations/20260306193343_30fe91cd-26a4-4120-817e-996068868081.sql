
-- Excluir lançamentos residuais duplicados do sistema antigo (contas_pagar)
-- Estes são registros avulsos criados pela lógica antiga que gerava duplicatas "(Residual)"
DELETE FROM contas_pagar WHERE id IN (
  '189f0d4d-48bd-4a0e-a390-392edfedd145',
  '35059338-2ef4-4989-9dd7-9cf243ec280d',
  '642b9fee-6d7a-4134-87a1-d46bfae25530'
);
