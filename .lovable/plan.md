

# Exibicao Unificada de Lancamentos com Multiplos Centros de Custo

## Resumo
Manter um unico lancamento financeiro por parcela com o valor cheio (ex: R$ 10.000), e exibir todos os centros de custo vinculados ao contrato na coluna de centro de custo. O rateio percentual so sera aplicado virtualmente no DRE.

## Como funciona hoje
- Cada lancamento em `contas_receber` / `contas_pagar` tem um unico campo `centro_custo` (UUID)
- A coluna de centro de custo exibe um unico `CompanyTag`

## O que muda

### 1. Criacao de Lancamentos (NovoContrato / EditarContrato)
- Cada parcela continua gerando **um unico** lancamento financeiro com o valor cheio
- O campo `centro_custo` do lancamento pode ser preenchido com o primeiro centro de custo do rateio (ou ficar nulo)
- A informacao completa de rateio fica na tabela `contratos_centros_custo` (ja planejada)

### 2. Exibicao nas telas de Contas a Receber, Contas a Pagar e Extrato
- Ao carregar os lancamentos, buscar tambem os dados de `contratos_centros_custo` via `parcela_id -> parcelas_contrato -> contrato_id`
- Na coluna de Centro de Custo, exibir **multiplos CompanyTags** quando houver mais de um CC
- Formato visual: dois chips lado a lado, ex: `[b8one 50%] [Lomadee 50%]`
- Para lancamentos avulsos (sem parcela/contrato), continua exibindo o CC simples

### 3. Filtro de Centro de Custo
- O filtro multi-select de centro de custo deve considerar que um lancamento pode pertencer a multiplos CCs
- Se o usuario filtrar por "b8one", lancamentos que tenham b8one em qualquer percentual do rateio devem aparecer
- O valor exibido continua sendo o valor cheio (R$ 10.000)

### 4. Filtro de Conta Bancaria
- Sem alteracao - o lancamento ja esta vinculado a uma unica conta bancaria
- Aparece o valor cheio normalmente

### 5. DRE (nao faz parte desta tarefa, ja planejado anteriormente)
- O DRE fara o split virtual usando os percentuais de `contratos_centros_custo`

## Detalhes Tecnicos

### Busca de dados de rateio
Nas paginas `Extrato.tsx`, `ContasReceber.tsx` e `ContasPagar.tsx`:
- Apos carregar os lancamentos, coletar todos os `parcela_id` nao nulos
- Buscar `parcelas_contrato` com seus `contrato_id`
- Buscar `contratos_centros_custo` com `centro_custo_id` expandido para obter `codigo` e `descricao`
- Montar um mapa: `parcela_id -> [{centro_custo_codigo, percentual}]`
- Enriquecer cada lancamento com o array de centros de custo

### Interface do lancamento (atualizar tipos)
```text
interface CentroCustoRateio {
  codigo: string;
  descricao: string;
  percentual: number;
}

// Adicionar aos tipos de lancamento:
centros_custo_rateio?: CentroCustoRateio[];
```

### Renderizacao da coluna Centro de Custo
- Se `centros_custo_rateio` existe e tem itens: exibir multiplos `CompanyTag` com percentual
- Senao: fallback para o `centro_custo` simples (comportamento atual)

### Filtro de Centro de Custo (ajuste)
- Verificar se o CC filtrado esta em `centros_custo_rateio` (qualquer item do array) OU no campo `centro_custo` legado

### Arquivos modificados
- **src/pages/Extrato.tsx**: buscar rateio, enriquecer lancamentos, ajustar coluna CC e filtro
- **src/pages/ContasReceber.tsx**: mesma logica de busca e exibicao
- **src/pages/ContasPagar.tsx**: mesma logica de busca e exibicao
- **src/components/centro-custos/CompanyBadge.tsx**: possivelmente adicionar variante compacta com percentual

### Fluxo visual
```text
Parcela: R$ 10.000,00
Conta Bancaria: Banco X
Centro de Custo: [b8one 50%] [Lomadee 50%]

DRE (separado):
  b8one -> R$ 5.000
  Lomadee -> R$ 5.000
```

