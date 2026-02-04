
## Plano: Area de Simulacao DRE com Valuation, Ponto de Equilibrio e IA

### Resumo

Criar uma nova area de **Simulacao** no Dashboard que permite:
1. Simular cenarios ajustando variaveis do DRE atual
2. Calcular e visualizar o **Ponto de Equilibrio Financeiro** com grafico interativo
3. Calcular valuation da empresa usando metodos DCF e Multiplo de EBITDA
4. Gerar insights automaticos via IA para apoio na tomada de decisao

---

### Funcionalidades Principais

**1. Simulador de Cenarios DRE**
- Campos para ajustar aumentos/reducoes percentuais ou valores absolutos em:
  - Receita
  - CMV (Custo Variavel)
  - Impostos
  - Emprestimos  
  - Despesas Financeiras
- Calculo automatico em tempo real:
  - Margem de Contribuicao
  - EBITDA
  - EBIT
  - Provisao CSLL e IRRF (34%)
  - Resultado do Exercicio

**2. Analise de Ponto de Equilibrio (Breakeven)**
- Calculo do ponto de equilibrio financeiro:
  - **Formula**: Ponto de Equilibrio = Custos Fixos / Margem de Contribuicao (%)
  - Onde Custos Fixos = Desp. ADM + Impostos + Emprestimos + Desp. Financeiras
- **Grafico interativo** mostrando:
  - Linha de Receita (azul)
  - Linha de Custos Totais (vermelho)
  - Linha de referencia horizontal no ponto de equilibrio (verde tracejada)
  - Area de lucro (verde) e area de prejuizo (vermelho)
  - Marcador visual do ponto de cruzamento
- Comparativo entre cenario atual e simulado

**3. Valuation da Empresa**
- **Metodo DCF (Fluxo de Caixa Descontado)**:
  - Taxa de desconto (WACC) configuravel (padrao: 15%)
  - Taxa de crescimento anual (padrao: 5%)
  - Periodo de projecao: 5 anos
  - Calculo do valor terminal
- **Metodo Multiplo de EBITDA**:
  - Multiplo configuravel (padrao: 6x)
  - Valor = EBITDA x Multiplo

**4. Analise com IA**
- Integracao com Lovable AI Gateway (requer configuracao do LOVABLE_API_KEY)
- Geracao automatica de:
  - Observacoes sobre pontos criticos do resultado simulado
  - Analise de riscos e oportunidades
  - Sugestoes de caminhos para melhoria
  - Recomendacoes de acao para tomada de decisao

---

### Arquitetura Tecnica

```text
+------------------------------------------------------------------+
|                         Dashboard                                 |
+------------------------------------------------------------------+
| [Faturamento] [Caixa] [DRE] [Credito] [Cobranca] [Simulacao]     |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|              DRESimulationAnalysis.tsx (novo)                     |
+------------------------------------------------------------------+
|  +----------------+  +----------------+  +--------------------+   |
|  | Ajustes DRE    |  | Ponto Equilib. |  | Valuation          |   |
|  | - Receita %    |  | - Grafico      |  | - DCF              |   |
|  | - CMV %        |  | - Breakeven    |  | - Multiplo EBITDA  |   |
|  | - Impostos %   |  | - Comparativo  |  |                    |   |
|  | - Emprest. %   |  |                |  |                    |   |
|  | - Desp.Fin. %  |  |                |  |                    |   |
|  +----------------+  +----------------+  +--------------------+   |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                Analise e Recomendacoes (IA)                 |  |
|  | - Observacoes   - Riscos   - Oportunidades   - Decisoes     |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                              | (para IA)
                              v
+------------------------------------------------------------------+
|           Edge Function: analyze-dre-simulation                   |
+------------------------------------------------------------------+
|  - Recebe dados do DRE simulado + breakeven + valuation          |
|  - Chama Lovable AI Gateway (LOVABLE_API_KEY)                    |
|  - Retorna analise estruturada                                   |
+------------------------------------------------------------------+
```

---

### Arquivos a Criar/Modificar

**Novos Arquivos:**

| Arquivo | Descricao |
|---------|-----------|
| `src/components/dashboard/DRESimulationAnalysis.tsx` | Componente principal da area de simulacao |
| `src/lib/valuation-utils.ts` | Funcoes para calculo de DCF, EBITDA multiplo e breakeven |
| `supabase/functions/analyze-dre-simulation/index.ts` | Edge function para integracao com IA |

**Arquivos a Modificar:**

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/dashboard/Dashboard.tsx` | Adicionar aba "Simulacao" e renderizar o novo componente |
| `supabase/config.toml` | Registrar nova edge function |

---

### Detalhes de Implementacao

**Calculo do Ponto de Equilibrio:**

```text
Margem de Contribuicao (%) = (Receita - CMV) / Receita x 100

Custos Fixos = Desp. ADM + Impostos + Emprestimos + Desp. Financeiras

Ponto de Equilibrio = Custos Fixos / (Margem de Contribuicao / 100)

Se Margem de Contribuicao <= 0:
  Ponto de Equilibrio = "Nao existe" (empresa nao cobre custos variaveis)
```

**Dados do Grafico de Breakeven:**

O grafico mostra a relacao entre receita e custos para diferentes niveis de faturamento:

```text
Eixo X: Receita (de 0 ate 150% da receita atual/simulada)
Eixo Y: Valores em R$

Linhas:
- Receita: y = x (linha diagonal, representa receita bruta)
- Custos Totais: y = Custos Fixos + (CMV/Receita) x X
- Ponto Equilibrio: ReferenceLine horizontal no valor calculado
```

**Formulas de Valuation:**

```text
DCF = Soma de (Fluxo Caixa Projetado / (1 + Taxa Desconto)^n) + Valor Terminal

Onde:
- Fluxo = EBITDA Simulado x (1 + Taxa Crescimento)^n
- Valor Terminal = Fluxo ano final / (Taxa Desconto - Taxa Crescimento Perpetua)
- Taxa Crescimento Perpetua = 3% (padrao)

Multiplo EBITDA = EBITDA Simulado x Multiplo
```

**Configuracoes Padrao de Valuation:**

| Parametro | Valor Padrao |
|-----------|--------------|
| Taxa de Desconto (WACC) | 15% |
| Taxa de Crescimento | 5% |
| Periodo de Projecao | 5 anos |
| Multiplo EBITDA | 6x |
| Taxa Perpetua | 3% |

---

### Layout Visual

```text
+--------------------------------------------------------------------+
|                  SIMULACAO DRE & VALUATION                          |
+--------------------------------------------------------------------+
|                                                                      |
| +----------------------------+  +--------------------------------+   |
| |    AJUSTES DE CENARIO      |  |      RESULTADO SIMULADO        |   |
| +----------------------------+  +--------------------------------+   |
| | Receita       [+10%] [R$]  |  | Receita:           R$ XXX.XXX  |   |
| | CMV           [-5%]  [R$]  |  | CMV:               R$ XXX.XXX  |   |
| | Impostos      [0%]   [R$]  |  | Margem Contrib:    XX,XX%      |   |
| | Emprestimos   [-10%] [R$]  |  | Desp. ADM:         R$ XXX.XXX  |   |
| | Desp.Financ.  [0%]   [R$]  |  | EBITDA:            R$ XXX.XXX  |   |
| |                            |  | Impostos:          R$ XXX.XXX  |   |
| | [Simular] [Limpar]         |  | Emprestimos:       R$ XXX.XXX  |   |
| +----------------------------+  | Desp. Financeiras: R$ XXX.XXX  |   |
|                                 | EBIT:              R$ XXX.XXX  |   |
|                                 | Provisao:          R$ XXX.XXX  |   |
|                                 | Resultado:         R$ XXX.XXX  |   |
|                                 +--------------------------------+   |
|                                                                      |
| +----------------------------------------------------------------+  |
| |              PONTO DE EQUILIBRIO FINANCEIRO                     |  |
| +----------------------------------------------------------------+  |
| |  Atual: R$ XXX.XXX  |  Simulado: R$ XXX.XXX  |  Var: +XX%       |  |
| |                                                                 |  |
| |          [GRAFICO DE BREAKEVEN]                                 |  |
| |                                                                 |  |
| |     ^                                    /                      |  |
| |     |                                 /  (Receita)              |  |
| |  R$ |                      *------/                             |  |
| |     |              ----*---   (Custos Totais)                   |  |
| |     |        ----/                                              |  |
| |     |   ----/    <-- Ponto Equilibrio                           |  |
| |     +-------------------------------------------------> Receita |  |
| |                                                                 |  |
| +----------------------------------------------------------------+  |
|                                                                      |
| +----------------------------+  +--------------------------------+   |
| |        VALUATION           |  |    COMPARATIVO (ATUAL vs SIM)  |   |
| +----------------------------+  +--------------------------------+   |
| | Taxa Desconto:   [15%]     |  |   [Grafico barras lado a lado] |   |
| | Taxa Crescimento: [5%]     |  |   Receita | EBITDA | Resultado |   |
| | Multiplo EBITDA:  [6x]     |  |                                |   |
| |                            |  |                                |   |
| | DCF:        R$ XX.XXX.XXX  |  |                                |   |
| | Multiplo:   R$ XX.XXX.XXX  |  |                                |   |
| +----------------------------+  +--------------------------------+   |
|                                                                      |
| +----------------------------------------------------------------+  |
| |                 ANALISE E RECOMENDACOES (IA)                    |  |
| +----------------------------------------------------------------+  |
| |  [Gerar Analise com IA]                                         |  |
| |                                                                  |  |
| |  OBSERVACOES:                                                   |  |
| |  - Ponto 1...                                                   |  |
| |  - Ponto 2...                                                   |  |
| |                                                                  |  |
| |  RISCOS:                                                        |  |
| |  - Risco 1...                                                   |  |
| |                                                                  |  |
| |  OPORTUNIDADES:                                                 |  |
| |  - Oportunidade 1...                                            |  |
| |                                                                  |  |
| |  RECOMENDACOES:                                                 |  |
| |  1. Caminho A...                                                |  |
| |  2. Caminho B...                                                |  |
| |  3. Caminho C...                                                |  |
| +----------------------------------------------------------------+  |
|                                                                      |
+--------------------------------------------------------------------+
```

---

### Grafico de Ponto de Equilibrio - Detalhes

O grafico usara Recharts com os seguintes elementos:

- **ComposedChart** para combinar linhas e areas
- **ReferenceLine** horizontal no valor do ponto de equilibrio
- **ReferenceArea** para destacar zonas de lucro (verde) e prejuizo (vermelho)
- **Area** com gradiente para mostrar a zona de lucro
- **Line** para receita e custos totais
- **Dot** customizado para marcar o ponto de cruzamento

```text
Dados do grafico (10 pontos de 0% a 150% da receita):

| % Receita | Receita   | Custos Totais | Lucro/Prejuizo |
|-----------|-----------|---------------|----------------|
| 0%        | R$ 0      | R$ CF         | -R$ CF         |
| 25%       | R$ X*0.25 | R$ CF + CV*0.25| ...          |
| 50%       | R$ X*0.50 | R$ CF + CV*0.50| ...          |
| 75%       | R$ X*0.75 | R$ CF + CV*0.75| ...          |
| 100%      | R$ X      | R$ CF + CV    | Resultado      |
| 125%      | R$ X*1.25 | R$ CF + CV*1.25| ...          |
| 150%      | R$ X*1.50 | R$ CF + CV*1.50| ...          |

Onde: CF = Custos Fixos, CV = Custos Variaveis (CMV)
```

---

### Dependencias

| Dependencia | Uso |
|-------------|-----|
| Recharts (ReferenceLine, ReferenceArea, ComposedChart) | Grafico de breakeven |
| Componentes UI existentes (Card, Input, Button, Slider) | Interface |
| CurrencyInput | Entrada de valores monetarios |
| Lovable AI Gateway | Analise com IA (requer LOVABLE_API_KEY) |

---

### Etapas de Implementacao

1. Criar `src/lib/valuation-utils.ts` com funcoes de calculo (DCF, multiplo, breakeven)
2. Criar `src/components/dashboard/DRESimulationAnalysis.tsx` com:
   - Formulario de ajustes
   - Display do DRE simulado
   - Grafico de ponto de equilibrio com ReferenceLine
   - Secao de valuation
   - Integracao com IA
3. Criar `supabase/functions/analyze-dre-simulation/index.ts`
4. Atualizar `supabase/config.toml` com nova function
5. Atualizar `src/components/dashboard/Dashboard.tsx`:
   - Adicionar 'simulacao' ao tipo analiseAtiva
   - Adicionar botao na navegacao
   - Renderizar DRESimulationAnalysis quando ativo

---

### Prompt para IA (Edge Function)

A edge function enviara para o Lovable AI Gateway:

```text
Analise os seguintes dados do DRE simulado de uma empresa brasileira:

CENARIO ATUAL:
- Receita: R$ X
- CMV: R$ X
- EBITDA: R$ X
- Resultado: R$ X
- Ponto de Equilibrio: R$ X

CENARIO SIMULADO:
- Receita: R$ Y (variacao de +X%)
- CMV: R$ Y
- EBITDA: R$ Y
- Resultado: R$ Y
- Ponto de Equilibrio: R$ Y

VALUATION:
- DCF: R$ Z
- Multiplo EBITDA: R$ W

Por favor, forneça em portugues brasileiro:
1. OBSERVACOES: 3-5 pontos importantes sobre o resultado
2. RISCOS: Potenciais riscos identificados no cenario
3. OPORTUNIDADES: Oportunidades de melhoria
4. RECOMENDACOES: 3-5 caminhos a seguir para tomada de decisao
```

---

### Requisito Adicional: LOVABLE_API_KEY

Para a integracao com IA funcionar, sera necessario configurar o secret `LOVABLE_API_KEY` nas configuracoes do projeto. Se nao estiver configurado, o botao de analise IA mostrara uma mensagem informando que a configuracao e necessaria.
