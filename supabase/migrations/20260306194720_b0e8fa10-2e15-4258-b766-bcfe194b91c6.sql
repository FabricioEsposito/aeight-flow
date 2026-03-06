-- Restaurar o valor original da Parcela 1 do contrato CV807858972
-- O valor da parcela original é 25045.22, mas o contas_pagar ficou em 17223.94 
-- após baixas parciais sem histórico (perdido na migração anterior)
UPDATE contas_pagar 
SET valor = 25045.22, 
    data_vencimento_original = NULL
WHERE id = '92471693-1310-4501-8494-16b0ce138e67';