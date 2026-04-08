

## Plano: Exportar Pagamento em Lote no Extrato

### Resumo
Adicionar um botao "Exportar Pagamento em Lote" na area de Extrato e Conciliacao, gerando uma planilha Excel no mesmo formato usado na Folha de Pagamento, com dados bancarios dos fornecedores.

### Escopo
A exportacao se aplica apenas aos lancamentos de **saida** (contas a pagar), pois sao esses que possuem fornecedores com dados bancarios cadastrados. Lancamentos de entrada (contas a receber) serao ignorados na exportacao.

### Formato da Planilha (identico ao da Folha)

| Coluna | Origem |
|---|---|
| Banco do Favorecido | codigo 3 digitos do fornecedor |
| Agencia do Favorecido | agencia do fornecedor |
| Conta do Favorecido | conta do fornecedor |
| Tipo de Conta do Favorecido | Corrente / Poupanca |
| Nome / Razao Social do Favorecido | razao_social do fornecedor |
| CPF/CNPJ do Favorecido | cnpj_cpf do fornecedor |
| Tipo de Transferencia | tipo_transferencia do fornecedor |
| Valor | valor do lancamento |
| Data de Pagamento | data_vencimento formatada dd/mm/aaaa |

---

### Alteracoes Tecnicas

**Arquivo: `src/pages/Extrato.tsx`**

1. Adicionar um botao "Exportar Pagamento em Lote" na barra de acoes (proximo aos botoes de exportar PDF/Excel existentes ou na area de acoes em lote).

2. Implementar funcao `handleExportBatchPayment`:
   - Filtrar `lancamentos` visíveis que sejam do tipo `saida` (origem === 'pagar') e com status `pendente`.
   - Coletar os `fornecedor_id` unicos desses lancamentos (o campo ja existe nos dados carregados das `contas_pagar`).
   - Buscar dados bancarios dos fornecedores via query ao Supabase (`banco_codigo, agencia, conta, tipo_conta_bancaria, tipo_transferencia, razao_social, cnpj_cpf`).
   - Montar a planilha no formato acima usando a lib `xlsx` (ja importada no projeto).
   - Gerar arquivo `pagamento_lote_extrato_YYYY-MM-DD.xls`.

3. Garantir que o `fornecedor_id` esteja disponivel no objeto `LancamentoExtrato` para lancamentos de saida (ja esta sendo mapeado na query atual via join com `fornecedores`). Caso nao esteja exposto diretamente, adicionar o campo ao mapeamento de dados.

### Observacao
A logica sera essencialmente a mesma da `handleExportBatchPayment` da FolhaPagamentoTab, adaptada para usar a estrutura de dados do Extrato.

