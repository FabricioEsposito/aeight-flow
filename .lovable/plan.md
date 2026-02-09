
# Analise de Gestao de Contratos - Nova aba no Dashboard

## Objetivo
Criar uma nova aba "Contratos" no Dashboard com os seguintes indicadores:
- **LTV (Life Time Value)**: media de dias/anos de atividade dos contratos ativos (hoje - data_inicio)
- **Ticket Medio**: media dos valores dos contratos ativos
- **Qtd. Contratos Ativos**: total de contratos com status "ativo"
- **Qtd. Contratos Inativos**: total de contratos com status "inativo"
- **Taxa de Churn**: valor dos contratos inativos / valor total dos contratos ativos

## Arquivos a criar/modificar

### 1. Criar `src/components/dashboard/GestaoContratosAnalysis.tsx`
Novo componente dedicado que:
- Busca contratos da tabela `contratos` (todos, sem filtro de periodo)
- Calcula os 5 indicadores
- Exibe 5 StatsCards seguindo o padrao visual existente (com suporte a `companyTheme`)
- Filtra por `centro_custo` quando selecionado
- Icones: FileText (LTV), Receipt (Ticket Medio), CheckCircle (Ativos), XCircle (Inativos), TrendingDown (Churn)

### 2. Modificar `src/components/dashboard/Dashboard.tsx`
- Adicionar `'contratos'` ao tipo do estado `analiseAtiva`
- Adicionar botao/aba "Contratos" na barra de abas (com icone FileText)
- Renderizar `GestaoContratosAnalysis` quando `analiseAtiva === 'contratos'`
- Passar `selectedCentroCusto` e `companyTheme` como props
- Mostrar filtro de centro de custo nesta aba

## Detalhes tecnicos

**Consulta ao banco:**
```sql
SELECT id, status, data_inicio, valor_total, centro_custo
FROM contratos
```

**Calculos:**
- **LTV**: Para cada contrato ativo, calcular `(hoje - data_inicio)` em dias, depois fazer a media. Exibir em dias e anos (ex: "365 dias (1,0 ano)")
- **Ticket Medio**: `SUM(valor_total dos ativos) / COUNT(ativos)`. Formatado como moeda (R$)
- **Ativos**: `COUNT(status = 'ativo')`
- **Inativos**: `COUNT(status = 'inativo')`
- **Taxa de Churn**: `SUM(valor_total dos inativos) / SUM(valor_total dos ativos) * 100`. Exibido como percentual
