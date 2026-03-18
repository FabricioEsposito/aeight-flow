

## Investigation Results: Saldo BTG Pactual B8One em 13/03

### What the Database Shows

The database confirms the balance for "Banco BTG Pactual - Matriz b8one" on 13/03 should indeed be approximately **R$ 0,00** (the exact value is -R$ 0,01 due to floating point precision with values like 12867.7735, 192850.488, 32445.48414).

### Root Causes Identified

**1. Floating Point Precision (minor)**
Values with many decimal places (e.g., R$ 32.445,48414) accumulate tiny rounding errors. The true balance on 13/03 is -R$ 0,011565 — essentially zero, but displayed as a small negative number.

**2. Filter Inconsistency in Running Balance (major)**
The `saldoInicial` for the table comes from `fluxoResult` which is calculated using ALL `lancamentos` (unfiltered). However, the running balance per row accumulates only from `filteredLancamentos` (filtered by search, tipo, status, centro de custo, categoria). If ANY of these non-bank-account filters are applied, the running balance becomes mathematically inconsistent — the starting point assumes all transactions exist, but the accumulation skips filtered-out ones.

### Proposed Fixes

**File: `src/pages/Extrato.tsx`**

1. **Round displayed balances to 2 decimal places** — Apply `Math.round(value * 100) / 100` to `saldoRealizado` and `saldoPrevisto` before display, so -0.01 shows as 0.00 (or -0.01 at worst, not -0.011565).

2. **Fix the filter consistency bug** — Recalculate `saldoInicial` for the table rows to account for paid transactions that exist but are filtered out by UI filters (search, tipo, status, centro de custo, categoria). When these filters remove paid items from view, the running balance must adjust the starting point to compensate:
   - Calculate `saldoInicialAjustado = saldoInicial + (paid amounts in lancamentos but NOT in filteredLancamentos)`
   - Use this adjusted value for the per-row running balance

3. **Apply same rounding fix to `calcularDadosComSaldos`** (used for PDF/Excel exports)

### Technical Detail

```text
Current (broken when filters active):
  saldoInicial (from ALL lancamentos)
  + filtered paid entries
  - filtered paid exits
  = WRONG (missing filtered-out paid items)

Fixed:
  saldoInicial (from ALL lancamentos)
  + adjustment for filtered-out paid items
  + filtered paid entries  
  - filtered paid exits
  = CORRECT
```

