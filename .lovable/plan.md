# Split Afiliado — Extrato e DRE

## Objetivo
Permitir registrar, em lançamentos de receita cujo serviço é "Marketing de Afiliados", um valor de **Split Afiliado** (parcela a ser repassada ao afiliado). Esse valor não altera o valor do lançamento — serve como informação contábil para uma nova visão do DRE.

## Banco de dados

Adicionar coluna em `contas_receber`:
- `split_afiliado` (numeric, nullable, default null) — valor em R$ do split repassado ao afiliado.

Sem alteração em RLS (já coberto pelas policies existentes).

## Onde editar o Split Afiliado

O campo aparece **somente quando o serviço selecionado for "Marketing de Afiliados"** (id `1cee9599-206e-47bc-b19e-d2cd8177d9d8`):

1. **Edição de parcela no extrato** (`EditParcelaDialog.tsx`)
   - Novo input "Split Afiliado (R$)" usando `CurrencyInput`.
   - Liberar edição mesmo quando a parcela já está baixada/conciliada (sem precisar reconciliar). Demais campos seguem a regra atual; somente `split_afiliado` é editável em qualquer status.
   - Helper text: "Valor repassado ao afiliado. Não altera o valor do lançamento."

2. **Lançamento avulso de receita** (`NovoLancamentoDialog.tsx`)
   - Mesmo input, condicional ao serviço selecionado.

3. **Importação por planilha** (`ImportarLancamentosDialog.tsx`)
   - Nova coluna opcional `split_afiliado` na planilha modelo.
   - Aplicada apenas quando `servico_id` corresponde a Marketing de Afiliados; caso contrário o valor é ignorado com aviso.
   - Atualizar template de download e parser.

4. **Exibição no extrato** (`Extrato.tsx`)
   - Mostrar o valor numa tag/coluna auxiliar discreta na linha (badge "Split: R$ X") quando preenchido, sem nova coluna obrigatória.

## DRE — Visão "Com Split Afiliado"

Em `DREAnalysis.tsx`:

1. Novo toggle no header: **"Visualizar DRE com Split Afiliado"** (ao lado dos toggles existentes), persistido no estado local.

2. Buscar `split_afiliado` em todas as `contas_receber` carregadas no período.

3. Quando o toggle está **ligado**:
   - Calcular `totalSplit` = soma de `split_afiliado` (por mês quando DRE mensal).
   - Subtrair `totalSplit` do total da Receita Bruta (linha 1.1 / "Receita de Clientes") do período/mês.
   - Inserir nova linha **logo após Receita Bruta**: `(-) Split Afiliado` com o valor negativo. Linha-resumo, sem detalhes.
   - **Ocultar** as linhas das categorias `2.1.11`, `2.1.12` e `2.1.13` (e excluir seus valores dos totais de CMV / resultado).
   - Recalcular totais subsequentes (Resultado Bruto, margens, AV%, AH%, etc.) com Receita ajustada e CMV reduzido.

4. Quando o toggle está **desligado**: comportamento atual, sem alterações.

5. O toggle vale tanto para a visão consolidada quanto para o DRE mensal e para os tooltips de AH%.

## Aspectos técnicos

```text
contas_receber
├── split_afiliado numeric NULL   ← novo
```

- Migration adiciona coluna; types do Supabase serão regenerados automaticamente.
- `EditParcelaDialog`: relaxar `disabled` apenas para o input de split quando status é `recebido`/baixado.
- `DREAnalysis`: 
  - novo state `showSplitAfiliado`
  - no fetch de receitas, incluir `split_afiliado` no select
  - função `getCategoriasOcultas()` retorna `['2.1.11','2.1.12','2.1.13']` quando `showSplitAfiliado`
  - injetar linha sintética `splitAfiliado` no array `dreData`/`dreMensal` posicionada após Receita Bruta
- Excel/PDF do DRE: respeitar o toggle (mesma estrutura visível).

## Fora de escopo
- Não cria tabela de "afiliados" nem cadastro do beneficiário do split (apenas o valor).
- Não gera lançamento automático de despesa a pagar para o afiliado.
- Sem alteração em comissionamento, faturamento ou cobrança.
## Status — implementação concluída
- ✅ Migration `split_afiliado` em `contas_receber`
- ✅ DRE: toggle, recálculo da Receita, ocultação 2.1.11/2.1.12/2.1.13, linha sintética "(-) Split Afiliado" no consolidado e mensal
- ✅ EditParcelaDialog: campo Split Afiliado condicional, liberado para qualquer status
- ✅ NovoLancamentoDialog: campo Split Afiliado condicional
- ✅ ImportarLancamentosDialog: coluna "Split Afiliado (R$)" no template + parsing + insert
- ✅ Extrato: badge "Split: R$ X" na linha
