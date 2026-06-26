# Refatorar fluxo de aprovação de Folha de Pagamento

Hoje a edição feita pela Analista de RH passa por duas etapas: Gerente de RH (aba "Aprovações RH") e depois Financeiro/Master (aba "Confirmação Financeiro"). O extrato só atualiza no final.

A pedido, vamos simplificar para um único nível — igual ao fluxo de NF/Reembolso:

```text
Analista edita valor/data → Solicitação pendente → Financeiro/Master aprova → Extrato atualizado
                                                ↘ Rejeita com motivo → Notifica analista
```

## Mudanças

### 1. Permissões (`src/hooks/useUserRole.ts`)
- `rh_manager` deixa de ter `canApproveRH` (apenas visualiza).
- `canApproveRH` passa a ser concedido a `admin` e `finance_manager`.
- `needsApprovalForRH` continua somente para `rh_analyst`.

### 2. Página de RH (`src/pages/RecursosHumanos.tsx`)
- Remover a aba **"Aprovações RH"**.
- Renomear a aba **"Confirmação Financeiro"** para **"Aprovações Folha"** (visível para admin/finance_manager).
- Remover rota/página `RHAprovacoes.tsx` e link do `AppSidebar.tsx`.

### 3. Novo painel `AprovacaoFolhaPanel.tsx` (substitui `AprovacaoRHPanel` + `ConfirmacaoFinanceiroRHDialog`)
Layout inspirado no `AprovacaoPrestadores`:
- Cards de KPI no topo (Pendentes, Aprovadas no mês, Rejeitadas, Valor pendente).
- Tabs **Pendentes / Histórico**.
- Tabela com: Data solicitação, Solicitante, Competência, Tipo, Lançamentos, Valor total, Status, Ações.
- Dialog de detalhes com tabela dos funcionários (razão social, CNPJ, salário base, valor líquido, vencimento).
- Botões **Aprovar** e **Rejeitar** (com motivo) direto na linha — ao aprovar, propaga para `parcelas_contrato` e `contas_pagar` (lógica atual do `ConfirmacaoFinanceiroRHDialog`) e marca solicitação como `aprovado_financeiro`.

### 4. `EditFolhaDialog.tsx`
- Mantém criação da solicitação quando `needsApprovalForRH` (analista). Sem mudança funcional, só ajusta a mensagem do toast para "Enviada para aprovação do Financeiro".

### 5. Limpeza
- Excluir `src/components/rh/AprovacaoRHPanel.tsx`, `src/components/rh/ConfirmacaoFinanceiroRHDialog.tsx`, `src/pages/RHAprovacoes.tsx`, `src/pages/RHConfirmacaoFinanceiro.tsx` (e rotas em `App.tsx`).

## Detalhes técnicos

- Sem migration: a coluna `status` em `solicitacoes_aprovacao_rh` já suporta `pendente` / `aprovado_financeiro` / `rejeitado`. O estado `aprovado_rh` deixa de ser usado para novas solicitações; histórico antigo continua exibido como "Aprovado RH".
- Notificação ao aprovar/rejeitar vai para o `solicitante_id` (analista). Notificação de "pendente" passa a ser enviada na criação da solicitação (no `EditFolhaDialog`/`ImportarFolhaDialog`) para admin + finance_manager — substituindo a notificação atual que era disparada após aprovação do RH.
