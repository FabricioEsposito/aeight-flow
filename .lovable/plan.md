

## Goal
Add a new export option in **Controle de Faturamento** that generates an Excel file in the exact format required by the user's bank for batch boleto issuance.

## Approach

**Split the existing "Exportar Excel" button into a dropdown** with two options:
1. **Exportar Excel (Detalhado)** — current report (unchanged)
2. **Exportar Boletos em Lote (Banco)** — new format

The new export will:
- Fetch additional client address fields (`endereco`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep`) which aren't currently loaded into the `Faturamento` interface
- Build a worksheet with the **exact 25 columns** specified by the user
- Apply the fixed values per spec

## New Excel column mapping

| # | Column | Source / Value |
|---|---|---|
| 1 | CNPJ ou CPF | `clientes.cnpj_cpf` (digits only) |
| 2 | Nome / Razao Social | `clientes.razao_social` |
| 3 | Telefone com DDD | (vazio) |
| 4 | Email | (vazio) |
| 5 | Notificação | `SemNotificacao` |
| 6 | CEP | `clientes.cep` (digits only) |
| 7 | Endereço | `clientes.endereco` |
| 8 | Número | `clientes.numero` |
| 9 | Complemento | `clientes.complemento` |
| 10 | Bairro | `clientes.bairro` |
| 11 | Cidade | `clientes.cidade` |
| 12 | Estado | `clientes.uf` |
| 13 | Seu número | `numero_nf` |
| 14 | Valor do boleto (R$) | `valor_liquido` (formatted `1.457,15`) |
| 15 | Vencimento | `data_vencimento` (DD/MM/YYYY) |
| 16 | Prazo para cancelamento | `90` |
| 17 | Prazo para negativação | `0` |
| 18 | Instruções | `APÓS O VENCIMENTO COBRAR MULTA DE 10,00% APÓS O VENCIMENTO COBRAR JUROS DE 10.00%` |
| 19 | Tipo de juros | `Porcentagem por mês` |
| 20 | Taxa de juros | `1,00` |
| 21 | Tipo de multa | `Porcentagem` |
| 22 | Taxa da multa | `10,00` |
| 23 | Tipo de desconto | `SemDesconto` |
| 24 | Taxa de desconto | `0,00` |
| 25 | Data limite de desconto | (vazio) |

> Note on item 20: the user did not specify a juros rate. I'll use **1,00** matching the example template — this can be adjusted later if needed.

## Technical changes

**File: `src/pages/ControleFaturamento.tsx`**
1. Extend the `Faturamento` interface and the Supabase query (`clientes:cliente_id` select) to include `endereco, numero, complemento, bairro, cidade, uf, cep`.
2. Replace the single `Exportar Excel` button with a `DropdownMenu` containing both export options.
3. Add a new `handleExportBoletosLote()` function that:
   - Uses respect to the **current filters** (date range, status, centro de custo, search) — exporting only `filteredFaturamentos`
   - Builds raw worksheet via `XLSX` directly (since `useExportReport` formats values inconsistently for this bank-required layout — strings must be raw, currency with comma decimal, etc.)
   - Generates filename `boletos_lote_YYYY-MM-DD.xls`

**Filtering for valid records:** Only include rows that have a `cliente_cnpj` and `numero_nf` (otherwise the bank import will reject them). A toast will warn if any rows are skipped.

## Out of scope
- No DB schema changes
- No changes to other export flows
- The existing detailed Excel export remains untouched

