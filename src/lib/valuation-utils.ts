// Tipos para DRE e Valuation
export interface DREValues {
  receita: number;
  cmv: number;
  despesasAdm: number;
  impostos: number;
  emprestimos: number;
  despesasFinanceiras: number;
}

export interface DRECalculated {
  receita: number;
  cmv: number;
  margemContribuicao: number;
  margemContribuicaoPercentual: number;
  despesasAdm: number;
  ebitda: number;
  impostos: number;
  emprestimos: number;
  despesasFinanceiras: number;
  ebit: number;
  provisaoCsllIrrf: number;
  resultado: number;
}

export interface ValuationConfig {
  taxaDesconto: number; // WACC em decimal (0.15 = 15%)
  taxaCrescimento: number; // em decimal (0.05 = 5%)
  taxaPerpetua: number; // em decimal (0.03 = 3%)
  periodoProjecao: number; // anos
  multiploEbitda: number; // ex: 6
}

export interface ValuationResult {
  dcf: number;
  multiploEbitda: number;
  fluxosProjetados: number[];
  valorTerminal: number;
}

export interface BreakevenResult {
  pontoEquilibrio: number;
  custoFixo: number;
  custoVariavelPercentual: number;
  margemContribuicaoPercentual: number;
  existe: boolean;
}

export interface BreakevenChartData {
  receita: number;
  custoTotal: number;
  lucro: number;
  percentual: number;
}

// Configuração padrão de valuation
export const DEFAULT_VALUATION_CONFIG: ValuationConfig = {
  taxaDesconto: 0.15, // 15% WACC
  taxaCrescimento: 0.05, // 5% ao ano
  taxaPerpetua: 0.03, // 3% perpetuidade
  periodoProjecao: 5, // 5 anos
  multiploEbitda: 6, // 6x
};

/**
 * Calcula o DRE com todos os valores derivados
 */
export function calcularDRE(values: DREValues): DRECalculated {
  const { receita, cmv, despesasAdm, impostos, emprestimos, despesasFinanceiras } = values;

  // Margem de Contribuição = Receita - CMV
  const margemContribuicao = receita - cmv;
  const margemContribuicaoPercentual = receita > 0 ? (margemContribuicao / receita) * 100 : 0;

  // EBITDA = Margem de Contribuição - Despesas ADM
  const ebitda = margemContribuicao - despesasAdm;

  // EBIT = EBITDA - Impostos - Empréstimos - Despesas Financeiras
  const ebit = ebitda - impostos - emprestimos - despesasFinanceiras;

  // Provisão CSLL e IRRF = 34% do EBIT (apenas se positivo)
  const provisaoCsllIrrf = ebit > 0 ? ebit * 0.34 : 0;

  // Resultado do Exercício = EBIT - Provisão
  const resultado = ebit - provisaoCsllIrrf;

  return {
    receita,
    cmv,
    margemContribuicao,
    margemContribuicaoPercentual,
    despesasAdm,
    ebitda,
    impostos,
    emprestimos,
    despesasFinanceiras,
    ebit,
    provisaoCsllIrrf,
    resultado,
  };
}

/**
 * Aplica ajustes percentuais aos valores do DRE
 */
export function aplicarAjustes(
  valoresOriginais: DREValues,
  ajustes: {
    receitaPercent: number;
    cmvPercent: number;
    impostosPercent: number;
    emprestimosPercent: number;
    despesasFinanceirasPercent: number;
  }
): DREValues {
  return {
    receita: valoresOriginais.receita * (1 + ajustes.receitaPercent / 100),
    cmv: valoresOriginais.cmv * (1 + ajustes.cmvPercent / 100),
    despesasAdm: valoresOriginais.despesasAdm, // Não ajustável no simulador
    impostos: valoresOriginais.impostos * (1 + ajustes.impostosPercent / 100),
    emprestimos: valoresOriginais.emprestimos * (1 + ajustes.emprestimosPercent / 100),
    despesasFinanceiras: valoresOriginais.despesasFinanceiras * (1 + ajustes.despesasFinanceirasPercent / 100),
  };
}

/**
 * Calcula o valuation usando DCF (Discounted Cash Flow)
 */
export function calcularDCF(
  ebitda: number,
  config: ValuationConfig
): { dcf: number; fluxosProjetados: number[]; valorTerminal: number } {
  const { taxaDesconto, taxaCrescimento, taxaPerpetua, periodoProjecao } = config;

  const fluxosProjetados: number[] = [];
  let valorPresente = 0;

  // Calcular fluxos projetados e valor presente
  for (let ano = 1; ano <= periodoProjecao; ano++) {
    const fluxo = ebitda * Math.pow(1 + taxaCrescimento, ano);
    fluxosProjetados.push(fluxo);
    valorPresente += fluxo / Math.pow(1 + taxaDesconto, ano);
  }

  // Valor Terminal = Fluxo do último ano * (1 + g) / (r - g)
  const fluxoUltimoAno = fluxosProjetados[fluxosProjetados.length - 1];
  const valorTerminal = (fluxoUltimoAno * (1 + taxaPerpetua)) / (taxaDesconto - taxaPerpetua);

  // Valor presente do valor terminal
  const valorPresenteTerminal = valorTerminal / Math.pow(1 + taxaDesconto, periodoProjecao);

  // DCF = Valor presente dos fluxos + Valor presente do valor terminal
  const dcf = valorPresente + valorPresenteTerminal;

  return {
    dcf,
    fluxosProjetados,
    valorTerminal,
  };
}

/**
 * Calcula o valuation usando múltiplo de EBITDA
 */
export function calcularMultiploEbitda(ebitda: number, multiplo: number): number {
  return ebitda * multiplo;
}

/**
 * Calcula o valuation completo (DCF + Múltiplo EBITDA)
 */
export function calcularValuation(ebitda: number, config: ValuationConfig): ValuationResult {
  const dcfResult = calcularDCF(ebitda, config);
  const multiploEbitdaValue = calcularMultiploEbitda(ebitda, config.multiploEbitda);

  return {
    dcf: dcfResult.dcf,
    multiploEbitda: multiploEbitdaValue,
    fluxosProjetados: dcfResult.fluxosProjetados,
    valorTerminal: dcfResult.valorTerminal,
  };
}

/**
 * Calcula o ponto de equilíbrio financeiro (breakeven)
 */
export function calcularBreakeven(dre: DRECalculated): BreakevenResult {
  // Custos Fixos = Desp. ADM + Impostos + Empréstimos + Desp. Financeiras
  const custoFixo = dre.despesasAdm + dre.impostos + dre.emprestimos + dre.despesasFinanceiras;

  // Custo Variável % = CMV / Receita
  const custoVariavelPercentual = dre.receita > 0 ? (dre.cmv / dre.receita) * 100 : 0;

  // Margem de Contribuição % = (Receita - CMV) / Receita
  const margemContribuicaoPercentual = dre.margemContribuicaoPercentual;

  // Ponto de Equilíbrio = Custos Fixos / (Margem de Contribuição %)
  const existe = margemContribuicaoPercentual > 0;
  const pontoEquilibrio = existe ? custoFixo / (margemContribuicaoPercentual / 100) : 0;

  return {
    pontoEquilibrio,
    custoFixo,
    custoVariavelPercentual,
    margemContribuicaoPercentual,
    existe,
  };
}

/**
 * Gera dados para o gráfico de breakeven
 */
export function gerarDadosGraficoBreakeven(
  breakeven: BreakevenResult,
  receitaAtual: number
): BreakevenChartData[] {
  const dados: BreakevenChartData[] = [];
  const { custoFixo, custoVariavelPercentual } = breakeven;
  
  // Gerar pontos de 0% a 150% da receita atual (ou do breakeven, o maior)
  const receitaMax = Math.max(receitaAtual, breakeven.pontoEquilibrio) * 1.5;
  const receitaMin = 0;
  const passos = 15;

  for (let i = 0; i <= passos; i++) {
    const percentual = (i / passos) * 150;
    const receita = (percentual / 100) * receitaAtual;
    
    // Custo Total = Custo Fixo + (Custo Variável % * Receita)
    const custoTotal = custoFixo + (custoVariavelPercentual / 100) * receita;
    
    // Lucro = Receita - Custo Total
    const lucro = receita - custoTotal;

    dados.push({
      receita,
      custoTotal,
      lucro,
      percentual,
    });
  }

  return dados;
}

/**
 * Formata valor em moeda brasileira
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata percentual
 */
export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(2)}%`;
}
