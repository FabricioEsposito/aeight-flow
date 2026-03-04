

## Plano: Importacao via Planilha para Folha de Pagamento

### Resumo

Criar um componente `ImportarFolhaDialog.tsx` que permite importar/atualizar dados da folha de pagamento via planilha Excel. O template sera baixado ja preenchido com todos os dados do periodo filtrado. O usuario preenche as colunas **Salario Base**, **Valor Liquido** e pode editar **Data Vencimento**.

### Fluxo do Usuario

1. Clica em **"Importar Planilha"** na aba Folha de Pagamento
2. Baixa o template preenchido com os dados do periodo atual
3. Preenche Salario Base e Valor Liquido, e opcionalmente edita Data Vencimento
4. Faz upload do arquivo
5. Sistema exibe preview destacando alteracoes
6. Confirma -- sistema atualiza `folha_pagamento`, `parcelas_contrato` e `contas_pagar`

### Template Pre-preenchido

| Coluna | Preenchida? | Editavel? |
|---|---|---|
| Competencia (MM/AAAA) | Sim | Nao (identificador) |
| Data Vencimento (DD/MM/AAAA) | Sim | **Sim** |
| Razao Social | Sim | Nao |
| Nome Fantasia | Sim | Nao |
| CNPJ/CPF | Sim | Nao (chave de match) |
| Categoria | Sim | Nao |
| Centro de Custo | Sim | Nao |
| Salario Base | Vazio | **Sim** |
| Valor Liquido | Vazio | **Sim** |

Aba "Instrucoes" com orientacoes de preenchimento.

### Logica de Matching (upload)

- Match por **CNPJ/CPF** + **Competencia (mes/ano)** + **Categoria**
- Localiza parcela e conta a pagar correspondentes

### Propagacao ao Confirmar

- **folha_pagamento**: upsert `salario_base`, `valor_liquido`
- **parcelas_contrato**: update `valor` com `valor_liquido`, update `data_vencimento` se alterada
- **contas_pagar**: update `valor`, `data_vencimento` e `data_competencia` se alterados

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/components/rh/ImportarFolhaDialog.tsx` | Novo -- dialog multi-step (download template / upload / preview / confirmar) |
| `src/components/rh/FolhaPagamentoTab.tsx` | Adicionar botao "Importar Planilha" e integrar dialog, passando `records` filtrados |

### Detalhes Tecnicos

- Usa lib `xlsx` ja instalada
- Template gerado a partir dos `records` ja carregados (sem query adicional)
- Preview mostra tabela com valores atuais vs novos, destacando alteracoes em amarelo
- Validacao: CNPJ existente, competencia valida, valores numericos, data no formato DD/MM/AAAA
- Segue padrao visual do `ImportarLancamentosDialog` existente
- Sem migrations SQL necessarias

