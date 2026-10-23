# Architecture rules

- The accountant retention report uses the pure calculation in `src/lib/retencoes-utils.ts`, with installment-level historical gross ahead of original-entry value and net reconstruction; current contract prices must not overwrite historical invoices.