
# Editar Valor do Lancamento no Extrato com Propagacao para Parcela do Contrato

## Objetivo
Permitir que o usuario edite o **valor original** de um lancamento diretamente na tela de Extrato, e que essa alteracao seja propagada automaticamente para a **parcela do contrato** (`parcelas_contrato`) vinculada, mantendo consistencia em todas as areas do sistema.

## O que muda

### 1. Componente `EditParcelaDialog.tsx` - Adicionar campo de Valor Original editavel
- Atualmente o valor original e exibido apenas como texto (somente leitura) na area de resumo
- Sera adicionado um campo `CurrencyInput` editavel para o **Valor Original**
- O calculo do valor total continuara funcionando: `Valor Total = Valor Original + Juros + Multa - Desconto`
- O `initialData` da interface passara a receber o valor original editavel

### 2. Pagina `Extrato.tsx` - Propagar alteracao para `parcelas_contrato`
- Na funcao `handleSaveEdit`, apos salvar a alteracao em `contas_receber` ou `contas_pagar`, verificar se o lancamento tem `parcela_id`
- Se tiver, atualizar tambem o campo `valor` na tabela `parcelas_contrato` com o novo valor original
- Isso garante que o contrato reflita o valor correto da parcela

### Fluxo de dados

1. Usuario abre o dialog de edicao no Extrato
2. Edita o **Valor Original** (e opcionalmente juros/multa/desconto)
3. O sistema salva na tabela `contas_receber` ou `contas_pagar`:
   - `valor_original` = novo valor original
   - `valor` = valor total calculado (original + juros + multa - desconto)
4. Se o lancamento estiver vinculado a um contrato (`parcela_id` nao nulo):
   - Atualiza `parcelas_contrato.valor` com o novo valor original
5. Todas as telas (Extrato, Contas a Receber/Pagar, Contrato) ficam sincronizadas

## Detalhes Tecnicos

### Arquivo: `src/components/financeiro/EditParcelaDialog.tsx`
- Adicionar estado `valorOriginal` editavel (em vez de derivar de `initialData`)
- Substituir a exibicao de texto do valor original por um `CurrencyInput`
- Recalcular `valorTotal` dinamicamente quando `valorOriginal` mudar

### Arquivo: `src/pages/Extrato.tsx`
- Na funcao `handleSaveEdit` (linha ~887):
  - Incluir `valor_original: data.valor_original` no `updateData`
  - Apos o update principal, verificar se `selectedLancamento.parcela_id` existe
  - Se sim, executar update em `parcelas_contrato` com `valor = data.valor_original`
