

## Cancelar parcela de contrato

Adicionar a ação **"Cancelar parcela"** nas listagens de parcelas vinculadas a contratos, permitindo marcar uma parcela específica como `cancelado` sem precisar inativar o contrato inteiro.

### Onde a ação aparece

1. **Contas a Receber** (`/contas-receber`) — menu de ações de cada linha
2. **Contas a Pagar** (`/contas-pagar`) — menu de ações de cada linha
3. **Extrato e Conciliações** (`/extrato`) — menu de ações de cada linha

### Comportamento

- **Quem pode usar**: somente `admin` e `finance_manager` (mesma regra dos outros ajustes financeiros sensíveis).
- **Quando aparece**: apenas para parcelas vinculadas a contrato (`parcela_id` preenchido) e com status `pendente` ou `vencido`. Parcelas `pago` não podem ser canceladas (precisam primeiro voltar para "em aberto"). Lançamentos avulsos continuam usando "Excluir lançamento".
- **Confirmação**: diálogo de confirmação obrigatório com:
  - Resumo da parcela (cliente/fornecedor, número da parcela, vencimento, valor)
  - Campo de **motivo do cancelamento** (texto livre, obrigatório)
  - Aviso de que a ação não exclui o registro — o status fica como **Cancelado** e some das visões financeiras
- **Reverter**: para reabrir uma parcela cancelada, o usuário usa a ação "Voltar em aberto" já existente (será habilitada também para status `cancelado`).

### Efeitos no banco

Para cada parcela cancelada, atualizar em uma transação:
1. `parcelas_contrato.status` → `cancelado`
2. `contas_receber.status` ou `contas_pagar.status` correspondente (mesmo `parcela_id`) → `cancelado`
3. Salvar o motivo em `observacoes` da conta (anexado com prefixo "Cancelamento: …" + data + usuário)

### Visibilidade após cancelamento

Já está coberto pela lógica existente do sistema — registros com status `cancelado` são automaticamente excluídos de:
- Extrato, Dashboard, DRE, Fluxo de Caixa
- Controle de Faturamento, Régua de Cobrança, Comissionamento
- Relatórios PDF/Excel

A parcela continua visível nas listas de Contas a Pagar/Receber com badge **"Cancelado"** (vermelho), permitindo auditoria e a ação de reabertura.

### Detalhes técnicos

**Arquivos a alterar:**
- `src/components/financeiro/ActionsDropdown.tsx`: adicionar prop `onCancel` e item "Cancelar parcela" (visível quando `!isAvulso && status !== 'pago' && status !== 'cancelado'`); habilitar "Voltar em aberto" também para status `cancelado`.
- `src/components/financeiro/ExtratoActionsDropdown.tsx`: mesma adição.
- `src/pages/ContasReceber.tsx`, `src/pages/ContasPagar.tsx`, `src/pages/Extrato.tsx`: handler `handleCancelParcela`, integração com `usePermissionCheck` (`canPerformBaixas`), refetch após sucesso.
- **Novo componente** `src/components/financeiro/CancelarParcelaDialog.tsx`: diálogo de confirmação com textarea obrigatório de motivo.
- Badge de status: garantir que "Cancelado" apareça com `variant="destructive"` nas três telas (já existe em ContasPagar; replicar onde faltar).

**Sem migrations**: o status `cancelado` já existe no enum `status_pagamento` e nas RLS policies de update.

