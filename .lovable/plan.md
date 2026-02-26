
# Plano: Area de RH com abas de Folha de Pagamento e Beneficios

## Resumo
Criar uma unica pagina "/rh" com duas abas: **Folha de Pagamento** e **Beneficios**. A pagina segue o padrao do Controle de Faturamento, com tabelas de controle e lancamento de valores vinculados a fornecedores. Ao ajustar valores, o sistema propaga para contas a pagar.

---

## 1. Banco de Dados - Novas Tabelas

### Tabela `folha_pagamento`
Controle mensal por funcionario (fornecedor CLT ou PJ):

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| fornecedor_id | uuid FK | Referencia fornecedores |
| contrato_id | uuid | Nullable, referencia contratos |
| parcela_id | uuid | Nullable, referencia parcelas_contrato |
| conta_pagar_id | uuid | Nullable, referencia contas_pagar |
| mes_referencia | integer | 1-12 |
| ano_referencia | integer | ex: 2026 |
| tipo_vinculo | varchar | 'CLT' ou 'PJ' |
| salario_base | numeric | default 0 |
| **Campos CLT** | | |
| inss_percentual / inss_valor | numeric | default 0 |
| fgts_percentual / fgts_valor | numeric | default 0 |
| irrf_percentual / irrf_valor | numeric | default 0 |
| vale_transporte_desconto | numeric | default 0 |
| outros_descontos | numeric | default 0 |
| outros_proventos | numeric | default 0 |
| **Campos PJ** | | |
| iss_percentual / iss_valor | numeric | default 0 |
| pis_percentual / pis_valor | numeric | default 0 |
| cofins_percentual / cofins_valor | numeric | default 0 |
| csll_percentual / csll_valor | numeric | default 0 |
| irrf_pj_percentual / irrf_pj_valor | numeric | default 0 |
| **Comuns** | | |
| valor_liquido | numeric | default 0 |
| observacoes | text | nullable |
| status | varchar | 'pendente', 'aprovado', 'processado' |
| created_at / updated_at | timestamptz | |
| created_by | uuid | nullable |

### Tabela `controle_beneficios`
Controle mensal de beneficios por fornecedor:

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| fornecedor_id | uuid FK | Referencia fornecedores |
| contrato_id | uuid | Nullable |
| parcela_id | uuid | Nullable |
| conta_pagar_id | uuid | Nullable |
| mes_referencia | integer | |
| ano_referencia | integer | |
| tipo_beneficio | varchar | 'VR', 'VA', 'VT', 'Plano de Saude', 'Plano Odontologico', 'Seguro de Vida', 'Outros' |
| descricao | text | nullable |
| valor | numeric | default 0 |
| observacoes | text | nullable |
| status | varchar | 'pendente', 'aprovado', 'processado' |
| created_at / updated_at | timestamptz | |
| created_by | uuid | nullable |

### RLS
Mesmo padrao das tabelas financeiras:
- SELECT: todos autenticados
- INSERT: todos autenticados
- UPDATE: admin + finance_manager
- DELETE: admin

---

## 2. Nova Pagina com Abas

### `src/pages/RecursosHumanos.tsx`
Pagina unica usando o componente `Tabs` do Radix com duas abas:

**Aba "Folha de Pagamento":**
- Filtros: mes/ano, tipo vinculo (CLT/PJ/Todos), busca por fornecedor, status, centro de custo
- Tabela: Competencia | Funcionario (fornecedor) | CNPJ/CPF | Tipo (CLT/PJ) | Salario Base | Impostos/Descontos | Valor Liquido | Status | Acoes
- Botao editar abre dialog com campos dinamicos conforme tipo CLT ou PJ
- Ao salvar, propaga valor para `contas_pagar` via `conta_pagar_id`

**Aba "Beneficios":**
- Filtros: mes/ano, fornecedor, tipo beneficio, status
- Tabela: Competencia | Fornecedor | Tipo | Descricao | Valor | Status | Acoes
- Edicao simples, propaga para contas a pagar

---

## 3. Componentes Auxiliares

- `src/components/rh/FolhaPagamentoTab.tsx` - Conteudo da aba Folha
- `src/components/rh/BeneficiosTab.tsx` - Conteudo da aba Beneficios
- `src/components/rh/EditFolhaDialog.tsx` - Dialog de edicao com campos CLT/PJ dinamicos
- `src/components/rh/EditBeneficioDialog.tsx` - Dialog de edicao de beneficio

---

## 4. Navegacao e Permissoes

- Novo grupo **"RH"** no sidebar (`AppSidebar.tsx`) com item unico: "Recursos Humanos" -> `/rh`
- Nova permissao `canAccessRH` no `useUserRole.ts`: acessivel para admin, finance_manager e finance_analyst
- Nova rota `/rh` no `App.tsx`
- Adicionar "RH" ao estado `openGroups` do sidebar

---

## 5. Integracao com Contas a Pagar

Quando o RH edita um valor na folha ou beneficio:
1. Atualiza o registro na tabela `folha_pagamento` ou `controle_beneficios`
2. Se `conta_pagar_id` existe, atualiza `contas_pagar.valor` com o novo valor liquido
3. Se `parcela_id` existe, atualiza `parcelas_contrato.valor` tambem

Isso garante que o Extrato e Contas a Pagar refletem automaticamente os ajustes do RH.

---

## 6. Fluxo do Usuario

```text
1. Fornecedor ja cadastrado (ex: "Joao Silva" tipo PJ ou "Maria" tipo CLT)
2. Contrato de compra criado com parcelas mensais
3. RH acessa menu RH -> Recursos Humanos
4. Na aba "Folha de Pagamento", ve parcelas do mes
5. Edita valores (salario, impostos, descontos)
6. Sistema salva e propaga para contas a pagar
7. Na aba "Beneficios", gerencia VR, VA, planos
8. Financeiro ve valores atualizados no Extrato
```

---

## 7. Arquivos a criar/modificar

**Criar:**
- `src/pages/RecursosHumanos.tsx`
- `src/components/rh/FolhaPagamentoTab.tsx`
- `src/components/rh/BeneficiosTab.tsx`
- `src/components/rh/EditFolhaDialog.tsx`
- `src/components/rh/EditBeneficioDialog.tsx`
- Migration SQL (tabelas + RLS)

**Modificar:**
- `src/App.tsx` - rota `/rh`
- `src/components/layout/AppSidebar.tsx` - grupo RH
- `src/hooks/useUserRole.ts` - permissao `canAccessRH`
