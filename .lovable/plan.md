

## Plan: Refactor Extrato Balance and Filter Logic

### Problem
The current Extrato page has balance calculation issues and the filter logic doesn't match the desired behavior of a real bank statement.

### New Business Rules

**Filter Logic (unified, no more DateTypeFilter selector):**
- Remove the date type filter selector entirely
- Use a single unified filter approach:
  - **Paid transactions (status='pago')**: filter by movement date (`data_recebimento` / `data_pagamento`)
  - **Pending/overdue transactions (status='pendente')**: filter by due date (`data_vencimento`)
- This way, the user sees what was actually paid on that date AND what's open/overdue within that date range

**Balance Composition:**
- **Saldo Realizado (Actual Balance)**: Only paid transactions compose the balance. Running total: `saldo_inicial + paid_entries - paid_exits`
- **Saldo Previsto (Projected Balance)**: `saldo_realizado + pending_in_dia_entries - pending_in_dia_exits`
- **Overdue transactions**: Do NOT compose any balance (neither realizado nor previsto)

**Balance Continuity (like a bank statement):**
- The initial balance comes from the bank account's `saldo_inicial` as of `data_inicio`
- `saldo_inicial + all_paid_entries_before_period - all_paid_exits_before_period = saldo_inicial_do_periodo`
- Each row shows a running balance: the final balance of row N is the initial balance of row N+1
- The final balance is the balance on the last transaction line

### Technical Changes

#### 1. Remove DateTypeFilter from Extrato
- **File**: `src/pages/Extrato.tsx`
- Remove `DateTypeFilter` component from the filter bar
- Remove `dateFilterType` session state
- Remove the dependency on `dateFilterType` in `useEffect`

#### 2. Rewrite `fetchLancamentos` query logic
- **File**: `src/pages/Extrato.tsx`
- **Paid transactions**: Query `contas_receber` where `status='pago'` filtered by `data_recebimento` within date range; query `contas_pagar` where `status='pago'` filtered by `data_pagamento` within date range
- **Pending/overdue transactions**: Query `contas_receber` where `status != 'pago'` and `status != 'cancelado'` filtered by `data_vencimento` within date range; same for `contas_pagar`
- Combine both result sets

#### 3. Rewrite sorting logic
- Sort all transactions by their "effective date":
  - Paid: use `data_recebimento` / `data_pagamento` (movement date)
  - Pending/overdue: use `data_vencimento`
- Sort ascending (oldest first), like a bank statement

#### 4. Rewrite per-row balance calculation
- Running balance per row:
  - `saldoRealizado`: accumulates only for paid transactions (entry adds, exit subtracts)
  - `saldoPrevisto`: `saldoRealizado + accumulated pending-em-dia entries - accumulated pending-em-dia exits`
  - Overdue: skip entirely from both balances
- The balance displayed on each row is the running total up to that row

#### 5. Update summary cards
- **Saldo Inicial**: calculated from bank account initial balance + all paid movements before the period
- **Entradas/Saídas**: show totals from filtered transactions (split by paid vs pending)
- **Saldo Final**: last row's running balance

#### 6. Update the client-side filter in `filteredLancamentos`
- Remove the `matchesDate` logic that checks `dateFilterType` since filtering now happens at query level
- The date filtering is already done by the queries, so no additional client-side date filter needed (or simplify it to use the effective date)

#### 7. Update exports
- The `calcularDadosComSaldos` function needs the same running balance logic

### Files to Edit
1. `src/pages/Extrato.tsx` — main refactor (query logic, sorting, balance calculation, remove DateTypeFilter)

### What stays the same
- `src/lib/fluxo-caixa-utils.ts` — the FluxoCaixaMensal component can keep its own logic
- All other filters (search, tipo, status, centro de custo, categoria, conta bancária) remain unchanged
- The movimentações anteriores logic for saldo inicial stays the same (already queries by `data_recebimento`/`data_pagamento`)

