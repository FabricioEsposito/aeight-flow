

# Plano: Beneficios baseados em Contratos com flag + ajuste de valor e centro de custo por parcela

## Status: ✅ IMPLEMENTADO

## Resumo
Aplicar na aba de Beneficios a mesma logica planejada para a Folha de Pagamento: adicionar uma flag `is_beneficio_funcionario` nos contratos. Contratos com essa flag aparecem automaticamente na aba de Beneficios, listando suas parcelas. O RH podera ajustar o valor e o percentual de rateio de centro de custo diretamente por parcela, impactando o DRE.

---

## 1. Banco de Dados ✅

### Novo campo na tabela `contratos`:
```text
ALTER TABLE contratos ADD COLUMN is_beneficio_funcionario boolean DEFAULT false;
```

---

## 2. BeneficiosTab ✅ - Reescrita para buscar parcelas de contratos com flag

## 3. EditBeneficioDialog ✅ - Adaptar para editar valor da parcela + rateio centro de custo

## 4. Formularios de Contrato ✅ - Checkbox "Beneficio para Funcionarios" em EditarContratoCompleto e NovoContrato
