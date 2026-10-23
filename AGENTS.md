# Architecture rules

- The accountant retention report uses the pure calculation in `src/lib/retencoes-utils.ts`, with installment-level historical gross ahead of original-entry value and net reconstruction; current contract prices must not overwrite historical invoices.
- Fiscal PDF checks run in `conferir-nf` after JWT and accountant/manager/admin authorization, accept only invoice IDs and approved storage references, and store hash-bound extractions in `conferencias_nf`; comparisons remain live against report values and never modify financial records.
- Invoice audit comparisons and identity validation share the dependency-free `conferir-nf/audit-utils.ts` module between the server and the report tests to keep review decisions consistent.