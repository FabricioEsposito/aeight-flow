

# Adicionar Centro de Custos nas Tabelas de Reajuste IPCA

## Contexto
A tabela de contratos na pagina /contratos ja possui a coluna "Centro Custos". Esta alteracao se refere as duas novas tabelas de reajuste IPCA que serao criadas na aba "Contratos" do Dashboard.

## Alteracao no plano original

No componente `src/components/dashboard/IPCAReajusteContratos.tsx` (a ser criado), ambas as tabelas incluirao a coluna "Centro de Custos":

### Tabela 1 - Contratos para Reajuste IPCA
Colunas atualizadas:
- Numero Contrato
- Cliente
- **Centro de Custos** (usando o componente `CompanyTag` ja existente)
- Valor Atual
- Data Inicio
- Meses de Vigencia

### Tabela 2 - Simulacao de Reajuste
Colunas atualizadas:
- Numero Contrato
- Cliente
- **Centro de Custos** (usando `CompanyTag`)
- Valor Atual
- IPCA Acumulado 12m (%)
- Valor Reajustado
- Diferenca
- Acoes (Aprovar / Manter)

## Detalhes tecnicos

- Buscar os dados de `centros_custo` pelo campo `centro_custo` do contrato (mesmo padrao usado em `ContratosTable.tsx`)
- Utilizar o componente `CompanyTag` de `@/components/centro-custos/CompanyBadge` para exibir o centro de custo com o mesmo visual padrao do sistema
- A query de contratos incluira um lookup nos centros de custo para obter codigo e descricao

```text
Layout atualizado:

+-----------------------------------------------+------------------------------------------------+
| Contratos para Reajuste IPCA                   | Simulacao de Reajuste IPCA                     |
|-----------------------------------------------|------------------------------------------------|
| Contrato | Cliente | CC    | Valor  | Inicio  | Contrato | Cliente | CC    | Atual | Reaj | Acao|
| CT-001   | Emp A   | CC-01 | 5.000  | 01/2025 | CT-001   | Emp A   | CC-01 | 5.000 | 5.228| [v] |
| CT-003   | Emp C   | CC-02 | 8.000  | 01/2025 | CT-003   | Emp C   | CC-02 | 8.000 | 8.364| [v] |
+-----------------------------------------------+------------------------------------------------+
```

Esta alteracao sera incorporada na implementacao completa do componente IPCAReajusteContratos junto com a edge function ipca-lookup e a integracao no GestaoContratosAnalysis.

