

# Plano: Beneficios baseados em Contratos com flag + ajuste de valor e centro de custo por parcela

## Resumo
Aplicar na aba de Beneficios a mesma logica planejada para a Folha de Pagamento: adicionar uma flag `is_beneficio_funcionario` nos contratos. Contratos com essa flag aparecem automaticamente na aba de Beneficios, listando suas parcelas. O RH podera ajustar o valor e o percentual de rateio de centro de custo diretamente por parcela, impactando o DRE.

---

## 1. Banco de Dados

### Novo campo na tabela `contratos`:
```text
ALTER TABLE contratos ADD COLUMN is_beneficio_funcionario boolean DEFAULT false;
```
- `false` = contrato normal
- `true` = contrato de beneficio para funcionarios, aparece na aba Beneficios do RH

Junto com o `tipo_funcionario` (CLT/PJ) ja planejado para a Folha, os contratos agora terao duas flags independentes para as duas abas do RH.

---

## 2. Reescrever BeneficiosTab

**Arquivo:** `src/components/rh/BeneficiosTab.tsx`

### Nova logica de listagem:
- Buscar `parcelas_contrato` onde o contrato tem `is_beneficio_funcionario = true`
- JOIN com `contratos` (para fornecedor_id, centro_custo, plano_contas_id)
- JOIN com `fornecedores` (razao_social, cnpj_cpf)
- JOIN com `contas_pagar` via parcela_id (para status de pagamento, data_competencia, data_pagamento)
- JOIN com `centros_custo` e `contratos_centros_custo` (para rateio)

### Colunas detalhadas:
| Coluna | Fonte |
|--------|-------|
| Competencia (mes/ano) | data_vencimento da parcela |
| Fornecedor | fornecedores.razao_social |
| CNPJ/CPF | fornecedores.cnpj_cpf |
| Tipo Beneficio | controle_beneficios.tipo_beneficio (se existir registro vinculado) |
| Centro de Custo | contratos_centros_custo (com percentuais) |
| Data Competencia | contas_pagar.data_competencia |
| Data Vencimento | parcelas_contrato.data_vencimento |
| Valor | parcelas_contrato.valor |
| Status | "Pago" / "Vencido" / "Em Aberto" (calculado) |
| Acoes | Editar (ajustar valor e centro de custo) |

### Filtros:
- Mes/Ano (por data_vencimento)
- Status (Pago/Em Aberto/Vencido/Todos)
- Centro de custo (multi-select)
- Busca por nome do fornecedor

### Remover:
- Botao "Novo Beneficio" (parcelas vem dos contratos)
- Botao excluir (gerenciado via contrato)

---

## 3. Adaptar EditBeneficioDialog

**Arquivo:** `src/components/rh/EditBeneficioDialog.tsx`

O dialog sera adaptado para receber dados da parcela e do contrato. Ao editar:
- Permite ajustar o **valor** da parcela
- Permite ajustar o **percentual de rateio de centro de custo** (editando `contratos_centros_custo` para aquela parcela/contrato)
- Permite definir/alterar o tipo de beneficio (VR, VA, VT, etc.) salvando em `controle_beneficios`

Ao salvar:
1. Atualiza `parcelas_contrato.valor`
2. Atualiza `contas_pagar.valor` (se houver conta vinculada)
3. Atualiza/cria registro em `controle_beneficios` para metadados (tipo, descricao)
4. Atualiza percentuais em `contratos_centros_custo` se alterados (impactando DRE)

---

## 4. Formularios de Contrato

**Arquivos:** `EditarContratoCompleto.tsx` e `NovoContrato.tsx`

Adicionar um checkbox **"Beneficio para Funcionarios"** visivel quando `tipoContrato === 'compra'`. Salva no campo `is_beneficio_funcionario` do contrato.

---

## 5. Arquivos a criar/modificar

**Migration SQL:** 1 arquivo
- `ALTER TABLE contratos ADD COLUMN is_beneficio_funcionario boolean DEFAULT false`

**Modificar:**
- `src/components/rh/BeneficiosTab.tsx` - Reescrever para buscar parcelas de contratos com flag
- `src/components/rh/EditBeneficioDialog.tsx` - Adaptar para editar valor da parcela + rateio centro de custo
- `src/pages/EditarContratoCompleto.tsx` - Adicionar checkbox is_beneficio_funcionario
- `src/pages/NovoContrato.tsx` - Adicionar checkbox is_beneficio_funcionario

---

## 6. Fluxo do usuario

```text
1. Cadastrar fornecedor de beneficio (ex: "Sodexo" ou "Unimed")
2. Criar contrato de compra, marcar "Beneficio para Funcionarios"
3. Parcelas mensais sao geradas automaticamente
4. RH acessa aba Beneficios, filtra por mes/ano
5. Ve todas as parcelas dos contratos de beneficio
6. Edita uma parcela: ajusta valor e percentual de centro de custo
7. Sistema propaga valor para contas a pagar e rateio para DRE
8. Financeiro ve valores atualizados no Extrato
```

