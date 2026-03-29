

## Plano: Área do Contador

### Resumo
Criar uma nova role `contador` no sistema com acesso restrito a duas áreas de leitura: **Extrato e Conciliação** (até o mês anterior fechado) e **Relatório de Retenções** (formato similar ao Controle de Faturamento, agrupado por mês de recebimento, com colunas IRRF, PIS, COFINS, CSLL).

---

### 1. Criar role `contador` no banco de dados

- Adicionar `'contador'` ao enum `app_role` via migration
- Criar RLS policy na tabela `user_roles` para permitir que admins atribuam essa role

### 2. Configurar permissões da role `contador`

**Arquivo:** `src/hooks/useUserRole.ts`

- Adicionar `'contador'` ao tipo `AppRole` e ao `roleLabels`
- Adicionar nova permission flag `canAccessContador: boolean`
- Role `contador` terá acesso somente a:
  - `canAccessContador: true`
  - Todas as outras permissões: `false`
- Role `admin` e `finance_manager` também terão `canAccessContador: true` para visualizar a mesma área

### 3. Atualizar ProtectedRoute

**Arquivo:** `src/components/ProtectedRoute.tsx`

- Incluir `canAccessContador` na checagem de `hasNoAccess` para que contadores não sejam bloqueados

### 4. Criar página do Contador com duas abas

**Arquivo:** `src/pages/AreaContador.tsx`

Página com tabs:

**Aba 1 - Extrato e Conciliação:**
- Reutilizar a lógica de dados do Extrato existente
- Filtro de data automático: sempre do início do ano até o último dia do mês anterior (ex: em março, mostra jan-fev)
- Modo somente leitura (sem botões de editar, criar, baixar, importar)
- Exibir as mesmas colunas do Extrato: Data, Descrição, Cliente/Fornecedor, Categoria, Centro de Custo, Conta Bancária, Entrada, Saída, Saldo
- Filtros de conta bancária e centro de custo disponíveis
- Exportação em Excel/PDF

**Aba 2 - Relatório de Retenções:**
- Buscar dados de `contas_receber` com joins em `contratos` e `clientes`
- Agrupado por mês de recebimento (data_recebimento) ao invés de competência
- Colunas: Mês, Cliente, CNPJ, Serviço, NF, Valor Bruto, IRRF, PIS, COFINS, CSLL, Valor Líquido
- Filtro por período (meses/ano)
- Mostrar apenas parcelas com status `pago` (já recebidas)
- Exportação em Excel/PDF
- Usar paginação para contornar limite de 1000 rows

### 5. Adicionar navegação no Sidebar

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Criar novo grupo "Contabilidade" no sidebar
- Item: "Área do Contador" → `/area-contador`
- Visível apenas para roles com `canAccessContador`

### 6. Adicionar rota no App.tsx

**Arquivo:** `src/App.tsx`

- Rota `/area-contador` → `<AreaContador />`
- Protegida pelo `ProtectedRoute`

### 7. Cadastro do Contador

- O admin cadastra o contador normalmente pela tela de Usuários
- Atribui a role `contador` ao usuário
- O contador faz login normal e vê apenas a área dele

---

### Detalhes Técnicos

- **Migration SQL:** `ALTER TYPE public.app_role ADD VALUE 'contador';`
- **Paginação:** Usar helper `fetchAllRows` com `.range()` em batches de 1000 para garantir dados completos
- **Cálculo do período fechado:** `new Date()` → pegar mês atual → subtrair 1 → último dia desse mês como data final
- **Retenções:** Calcular valores usando os percentuais do contrato vinculado (`irrf_percentual`, `pis_percentual`, `cofins_percentual`, `csll_percentual`) aplicados ao `valor` da parcela recebida

