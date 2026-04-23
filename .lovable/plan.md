

## Conciliação automática via OFX — dentro do Extrato

Adicionar a importação e conciliação automática de extrato bancário **dentro da própria página `/extrato`**, sem criar nova rota. O fluxo cruza cada lançamento do banco com as parcelas pendentes do sistema (sugerindo baixas) e, para transações sem match, abre o mesmo formulário de "Novo Lançamento" pré-preenchido — exatamente como já acontece na importação via planilha.

### Onde fica

Novo botão **"Conciliar extrato"** no cabeçalho de `/extrato`, ao lado dos botões existentes ("Novo Lançamento", "Importar Lançamentos", "Exportar"). Sem alterações no menu lateral.

### Fluxo do usuário

1. Em **Extrato e Conciliações**, clique em **"Conciliar extrato"**
2. Diálogo passo 1: selecione a **conta bancária** e faça upload do arquivo `.ofx` (ou `.csv`/`.xlsx` no template padrão já usado em "Importar Lançamentos")
3. O sistema lê todas as transações e procura candidatos em `contas_receber`/`contas_pagar` da mesma conta bancária com status `pendente`/`vencido`
4. Diálogo passo 2 — tabela de revisão com 3 grupos:
   - **Match único** (1 candidato com score ≥ 80) — pré-selecionado, basta confirmar para baixar
   - **Múltiplos candidatos** (score 50–79 ou >1 candidato) — escolha qual parcela bater no dropdown da linha
   - **Sem match** — botão **"Criar lançamento"** que abre o `NovoLancamentoDialog` já pré-preenchido com data, valor, descrição e tipo (entrada/saída) da transação do extrato; após salvar, a transação volta para a tabela como "conciliada com novo lançamento"
5. Botão **"Confirmar selecionados"** processa em lote:
   - Itens com match marcados → status `pago`/`recebido`, `data_pagamento`/`data_recebimento` = data da transação OFX, `conta_bancaria_id` = a da importação
   - Itens "sem match" sem ação → ficam ignorados (não criam nada)

### Critérios de matching (score 0–100)

- **Valor exato** (±R$ 0,01): +60 (±R$ 1,00: +40)
- **Vencimento** dentro de ±7 dias da data do extrato: +20 (±1 dia: +30)
- **Descrição** do extrato contém nome/CNPJ do cliente/fornecedor: +15
- **Tipo** bate (entrada → contas_receber; saída → contas_pagar): obrigatório

Score ≥ 80 = match exato. 50–79 = sugerido com revisão. <50 = sem match.

### Lançamentos avulsos pré-preenchidos

Quando o usuário clica **"Criar lançamento"** numa transação sem match, o `NovoLancamentoDialog` abre com:
- **Tipo**: entrada/saída conforme OFX
- **Data de competência** e **vencimento**: data da transação
- **Data de pagamento/recebimento**: data da transação (já marcado como pago)
- **Valor**: valor da transação
- **Descrição**: descrição do OFX (editável)
- **Conta bancária**: a da importação (travada)
- **Status**: pago/recebido
- Cliente/fornecedor, plano de contas, centro de custo: o usuário preenche

Mesmo padrão da importação por planilha já existente.

### Permissões

- **Admin** e **finance_manager**: importam e confirmam
- **finance_analyst**: importa e revisa, mas confirmação final exige aprovador (mesmo padrão dos demais ajustes financeiros)
- Demais papéis: botão oculto

### Detalhes técnicos

**Sem nova rota, sem novo item de menu**.

**Nova tabela `extratos_importados`**:
- `id`, `conta_bancaria_id`, `nome_arquivo`, `data_inicio`, `data_fim`, `total_transacoes`, `total_conciliadas`, `created_by`, `created_at`

**Nova tabela `extrato_transacoes`**:
- `id`, `extrato_importado_id`, `fitid` (ID único do OFX, evita duplicatas em re-importações), `data_movimento`, `valor`, `tipo`, `descricao`, `status` (pendente/conciliado/ignorado), `conta_receber_id`, `conta_pagar_id`, `created_at`

RLS: select para `authenticated`; insert/update para `admin` + `finance_manager` + `finance_analyst`.

**Parser OFX**: biblioteca `node-ofx-parser` (puro JS, lê OFX 1.x SGML e 2.x XML). CSV/Excel reaproveitam o parser de `ImportarLancamentosDialog`.

**Algoritmo de match**: roda no client após upload — uma query única busca candidatos pendentes da conta no range ±15 dias e o score é calculado em memória.

**Arquivos novos**:
- `src/components/financeiro/ConciliarExtratoDialog.tsx` — diálogo de 2 passos (upload + revisão)
- `src/components/financeiro/ConciliacaoMatchingTable.tsx` — tabela com grupos e ações por linha
- `src/lib/ofx-parser.ts` — parsing de OFX/CSV/Excel
- `src/lib/conciliacao-matcher.ts` — algoritmo de score

**Arquivos a alterar**:
- `src/pages/Extrato.tsx` — novo botão "Conciliar extrato" no header e renderização do diálogo
- `src/components/financeiro/NovoLancamentoDialog.tsx` — aceitar prop `prefilledData` (data, valor, descrição, tipo, conta_bancaria_id, status) para abrir já preenchido a partir da conciliação

**Migrations**: criar as 2 tabelas com RLS.

**Sem custos externos**: parser roda no client. As tabelas ficam prontas para receber dados de uma futura integração Open Finance (Pluggy/Belvo) sem refazer a UI.

