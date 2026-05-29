# Comissionamento de Parceiros

## Visão geral
Parceiros são indicadores externos (não-staff) que recebem percentual fixo sobre os recebimentos do contrato indicado. Vão reaproveitar a tabela `vendedores` com um marcador `tipo`, mas **não** participam de meta batida, override por contrato nem comissão extraordinária — apenas o `percentual_comissao` cadastrado no parceiro, aplicado sobre cada parcela recebida do(s) contrato(s) em que ele foi indicado.

## Banco de dados (1 migration)

1. **`vendedores.tipo`** (`text`, default `'interno'`, check em `'interno' | 'parceiro'`).
2. **`contratos.parceiro_id`** (`uuid`, nullable) — referência ao vendedor com `tipo='parceiro'`.
3. Sem novas tabelas — `solicitacoes_comissao` e `comissao_percentual_override` continuam servindo (override fica desabilitado na UI para parceiros).

## Cadastro de parceiros (`/vendedores`)

- Nova aba **"Parceiros"** ao lado de "Vendedores" usando o mesmo componente, com `tipo='parceiro'` fixo.
- Formulário simplificado: nome, % de comissão, fornecedor vinculado (obrigatório, para gerar contas a pagar), status. Sem meta, sem centro de custo (parceiro não tem meta).
- Listagem filtra por `tipo`. Vínculo `vendedores_centros_custo` não é usado para parceiros.

## Contratos

- Em `NovoContrato.tsx` e `EditarContratoCompleto.tsx`: adicionar campo **"Parceiro da venda"** (opcional, só em contratos de venda), usando um `ParceiroSelect` análogo ao `VendedorSelect`, mas filtrando `tipo='parceiro'`.
- Persistir em `contratos.parceiro_id`.

## Área de Comissionamento de Parceiros (`/comissionamento-parceiros`)

Nova página espelhando `Comissionamento.tsx`, mas com regras enxutas:

- **Seleção**: dropdown de parceiros (vendedores com `tipo='parceiro'`).
- **Cálculo**: para o mês/ano de referência, soma `contas_receber` com `status='recebido'` cujo `parcela_id` pertence a contrato com `parceiro_id = parceiro selecionado` (filtrar por `data_recebimento` no mês de referência). Aplica `percentual_comissao` do parceiro.
- **Sem** meta batida, **sem** extraordinária, **sem** override por contrato (botões/abas removidos).
- **Fluxo de solicitação/aprovação**: mesmo de vendedores (`solicitacoes_comissao` → admin/finance_manager aprovam → gera `contas_pagar` vinculada ao `fornecedor_id` do parceiro). Adicionar coluna implícita no filtro: `vendedor.tipo='parceiro'` separa as filas.
- **Sidebar**: novo item "Comissão Parceiros" no grupo Comercial.

## Frontend — arquivos afetados

- `src/pages/Vendedores.tsx` — abas Vendedores / Parceiros.
- `src/components/contratos/ParceiroSelect.tsx` — novo (clone enxuto de `VendedorSelect`).
- `src/pages/NovoContrato.tsx`, `src/pages/EditarContratoCompleto.tsx` — campo parceiro + persistência.
- `src/pages/ComissionamentoParceiros.tsx` — nova página (versão reduzida de `Comissionamento.tsx`).
- `src/App.tsx` — rota nova.
- `src/components/layout/AppSidebar.tsx` — item novo.
- `Comissionamento.tsx` existente — filtrar dropdown para `tipo='interno'` para não misturar.

## Fora do escopo
- Edição em massa de parceiros, dashboard próprio, exportação dedicada (podemos fazer depois se precisar).
