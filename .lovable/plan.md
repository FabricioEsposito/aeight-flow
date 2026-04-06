

## Plano: Exportação de Folha para Pagamento em Lote + Dados Bancários no Cadastro

### Resumo
Adicionar campos bancários ao cadastro de fornecedores (banco, agência, conta, tipo conta, tipo transferência) com busca de bancos via API Bankly, e exportar a folha de pagamento em Excel no formato exigido para pagamentos em lote bancário.

---

### 1. Migration: Adicionar colunas bancárias na tabela `fornecedores`

Novas colunas (todas nullable):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| banco_codigo | varchar | Código do banco (3 dígitos, ex: 001) |
| banco_nome | varchar | Nome do banco (para exibição no cadastro) |
| agencia | varchar | Número da agência |
| conta | varchar | Número da conta |
| tipo_conta | varchar | "corrente" ou "poupanca" |
| tipo_transferencia | varchar | "TED", "TEF" ou "PIX" |

### 2. Edge Function: Proxy para API Bankly

**Arquivo:** `supabase/functions/bank-list/index.ts`

- Proxy para `GET https://api-mtls.sandbox.bankly.com.br/banklist`
- Retorna lista de bancos para busca por código ou nome no frontend

### 3. Formulário de Fornecedor: Campos bancários

**Arquivo:** `src/components/fornecedores/FornecedorForm.tsx`

- Nova seção "Dados Bancários":
  - **Banco**: autocomplete com busca via edge function (código + nome)
  - **Agência**, **Conta**: inputs texto
  - **Tipo de Conta**: select (Corrente / Poupança)
  - **Tipo de Transferência**: select (TED / TEF / PIX)

### 4. Exportação Excel na Folha de Pagamento

**Arquivo:** `src/components/rh/FolhaPagamentoTab.tsx`

Botão "Exportar Pagamento em Lote" gerando Excel com as colunas:

| Coluna no Excel | Origem |
|---|---|
| Banco do Favorecido | **Somente o código de 3 dígitos** (`banco_codigo`) |
| Agência do Favorecido | `agencia` |
| Conta do Favorecido | `conta` |
| Tipo de Conta do Favorecido | `tipo_conta` |
| Nome / Razão Social do Favorecido | Nome do fornecedor |
| CPF/CNPJ do Favorecido | CNPJ/CPF do fornecedor |
| Tipo de Transferência | `tipo_transferencia` |
| Valor | Valor da parcela |
| Data de Pagamento | `data_vencimento` formatada dd/mm/aaaa |

