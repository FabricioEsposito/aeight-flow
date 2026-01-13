/**
 * Utilitário para cálculo preciso de fluxo de caixa
 * 
 * Regras:
 * - Dia 1: saldo inicial + entradas + saídas = saldo final
 * - Dia 2: saldo inicial (= saldo final do dia anterior) + entradas + saídas = saldo final
 * - Somente movimentações PAGAS afetam o saldo realizado
 * - Pendentes EM DIA (vencimento >= hoje) contam para saldo previsto
 * - Vencidos NÃO contam no saldo
 */

export interface MovimentacaoFluxo {
  valor: number;
  data_movimento: string; // data_recebimento ou data_pagamento para pagos, data_vencimento para pendentes
  tipo: 'entrada' | 'saida';
  status: 'pago' | 'pendente' | 'vencido';
  conta_bancaria_id: string | null;
}

export interface FluxoDiario {
  date: string; // formato YYYY-MM-DD
  dateFormatted: string; // formato DD/MM
  saldoInicial: number;
  entradaRealizada: number;
  entradaPrevista: number;
  saidaRealizada: number;
  saidaPrevista: number;
  saldoFinalRealizado: number; // apenas pagos
  saldoFinalPrevisto: number; // pagos + pendentes em dia
}

export interface ContaBancariaSaldo {
  id: string;
  saldo_inicial: number;
  data_inicio: string;
}

export interface FluxoCaixaParams {
  dataInicio: string; // formato YYYY-MM-DD
  dataFim: string; // formato YYYY-MM-DD
  contasBancarias: ContaBancariaSaldo[];
  contasBancariasIds: string[]; // IDs selecionados, vazio = todas
  movimentacoesAnteriores: { valor: number; tipo: 'entrada' | 'saida'; conta_bancaria_id: string | null }[];
  movimentacoesNoPeriodo: MovimentacaoFluxo[];
}

export interface FluxoCaixaResult {
  saldoInicialPeriodo: number;
  saldoFinalRealizado: number;
  saldoFinalPrevisto: number;
  fluxoDiario: FluxoDiario[];
  totalEntradasRealizadas: number;
  totalEntradasPrevistas: number;
  totalSaidasRealizadas: number;
  totalSaidasPrevistas: number;
}

/**
 * Calcula o fluxo de caixa dia a dia como uma planilha
 */
export function calcularFluxoCaixa(params: FluxoCaixaParams): FluxoCaixaResult {
  const {
    dataInicio,
    dataFim,
    contasBancarias,
    contasBancariasIds,
    movimentacoesAnteriores,
    movimentacoesNoPeriodo
  } = params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);

  // Filtrar contas bancárias
  const contasFiltradas = contasBancariasIds.length === 0
    ? contasBancarias
    : contasBancarias.filter(c => contasBancariasIds.includes(c.id));

  // Saldo inicial das contas (soma dos saldo_inicial cadastrados)
  const saldoInicialContas = contasFiltradas.reduce((acc, conta) => acc + conta.saldo_inicial, 0);

  // Filtrar movimentações anteriores por conta bancária
  const movAnterioresFiltradas = contasBancariasIds.length === 0
    ? movimentacoesAnteriores
    : movimentacoesAnteriores.filter(m => m.conta_bancaria_id && contasBancariasIds.includes(m.conta_bancaria_id));

  // Calcular entradas e saídas PAGAS antes do período
  const entradasAnteriores = movAnterioresFiltradas
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.valor, 0);
  
  const saidasAnteriores = movAnterioresFiltradas
    .filter(m => m.tipo === 'saida')
    .reduce((acc, m) => acc + m.valor, 0);

  // Saldo inicial do período = saldo_inicial + entradas pagas antes - saídas pagas antes
  const saldoInicialPeriodo = saldoInicialContas + entradasAnteriores - saidasAnteriores;

  // Filtrar movimentações do período por conta bancária
  const movNoPeriodoFiltradas = contasBancariasIds.length === 0
    ? movimentacoesNoPeriodo
    : movimentacoesNoPeriodo.filter(m => m.conta_bancaria_id && contasBancariasIds.includes(m.conta_bancaria_id));

  // Gerar array de todos os dias do período
  const dias: string[] = [];
  const currentDate = new Date(dataInicio + 'T00:00:00');
  const endDate = new Date(dataFim + 'T00:00:00');
  
  while (currentDate <= endDate) {
    dias.push(formatDateLocal(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Agrupar movimentações por dia
  const movimentacoesPorDia: Record<string, {
    entradaRealizada: number;
    entradaPrevista: number;
    saidaRealizada: number;
    saidaPrevista: number;
  }> = {};

  // Inicializar todos os dias com zero
  for (const dia of dias) {
    movimentacoesPorDia[dia] = {
      entradaRealizada: 0,
      entradaPrevista: 0,
      saidaRealizada: 0,
      saidaPrevista: 0
    };
  }

  // Processar cada movimentação
  for (const mov of movNoPeriodoFiltradas) {
    // Normalizar a data para YYYY-MM-DD (remove timestamp se existir)
    const data = normalizeDateToYYYYMMDD(mov.data_movimento);
    
    // Ignorar se data inválida ou fora do período
    if (!data || data < dataInicio || data > dataFim) continue;
    
    // Garantir que o dia existe no mapa
    if (!movimentacoesPorDia[data]) {
      movimentacoesPorDia[data] = {
        entradaRealizada: 0,
        entradaPrevista: 0,
        saidaRealizada: 0,
        saidaPrevista: 0
      };
    }

    if (mov.status === 'pago') {
      // Movimentações pagas = realizadas
      if (mov.tipo === 'entrada') {
        movimentacoesPorDia[data].entradaRealizada += mov.valor;
      } else {
        movimentacoesPorDia[data].saidaRealizada += mov.valor;
      }
    } else if (mov.status === 'pendente') {
      // Pendentes: só conta se vencimento >= hoje (em dia)
      const dataVencimento = new Date(data + 'T00:00:00');
      if (dataVencimento >= today) {
        if (mov.tipo === 'entrada') {
          movimentacoesPorDia[data].entradaPrevista += mov.valor;
        } else {
          movimentacoesPorDia[data].saidaPrevista += mov.valor;
        }
      }
      // Vencidos são ignorados (não afetam saldo)
    }
    // status === 'vencido' é ignorado
  }

  // Calcular fluxo dia a dia
  const fluxoDiario: FluxoDiario[] = [];
  let saldoAcumuladoRealizado = saldoInicialPeriodo;
  let saldoAcumuladoPrevisto = saldoInicialPeriodo;

  let totalEntradasRealizadas = 0;
  let totalEntradasPrevistas = 0;
  let totalSaidasRealizadas = 0;
  let totalSaidasPrevistas = 0;

  for (const dia of dias) {
    const mov = movimentacoesPorDia[dia];
    
    const saldoInicialDia = saldoAcumuladoRealizado;
    
    // Saldo final realizado = saldo inicial + entradas pagas - saídas pagas
    const saldoFinalRealizadoDia = saldoAcumuladoRealizado + mov.entradaRealizada - mov.saidaRealizada;
    
    // Saldo final previsto = saldo realizado + pendentes em dia
    const saldoFinalPrevistoDia = saldoFinalRealizadoDia + mov.entradaPrevista - mov.saidaPrevista;

    fluxoDiario.push({
      date: dia,
      dateFormatted: formatDateDisplay(dia),
      saldoInicial: saldoInicialDia,
      entradaRealizada: mov.entradaRealizada,
      entradaPrevista: mov.entradaPrevista,
      saidaRealizada: mov.saidaRealizada,
      saidaPrevista: mov.saidaPrevista,
      saldoFinalRealizado: saldoFinalRealizadoDia,
      saldoFinalPrevisto: saldoFinalPrevistoDia
    });

    // Atualizar saldo acumulado para o próximo dia
    // O saldo inicial do próximo dia = saldo final realizado deste dia
    saldoAcumuladoRealizado = saldoFinalRealizadoDia;
    saldoAcumuladoPrevisto = saldoFinalPrevistoDia;

    // Acumular totais
    totalEntradasRealizadas += mov.entradaRealizada;
    totalEntradasPrevistas += mov.entradaPrevista;
    totalSaidasRealizadas += mov.saidaRealizada;
    totalSaidasPrevistas += mov.saidaPrevista;
  }

  return {
    saldoInicialPeriodo,
    saldoFinalRealizado: saldoAcumuladoRealizado,
    saldoFinalPrevisto: saldoAcumuladoPrevisto,
    fluxoDiario,
    totalEntradasRealizadas,
    totalEntradasPrevistas,
    totalSaidasRealizadas,
    totalSaidasPrevistas
  };
}

/**
 * Normaliza uma string de data para o formato YYYY-MM-DD
 * Aceita formatos: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, etc.
 */
export function normalizeDateToYYYYMMDD(dateStr: string): string {
  if (!dateStr) return '';
  // Se já está no formato YYYY-MM-DD (10 caracteres), retorna como está
  if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // Se tem timestamp, extrai apenas a parte da data
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  // Caso tenha espaço (formato com hora), extrai apenas a data
  if (dateStr.includes(' ')) {
    return dateStr.split(' ')[0];
  }
  // Tenta parsear como Date e formatar
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return formatDateLocal(date);
  }
  return dateStr;
}

/**
 * Formata data para YYYY-MM-DD
 */
export function formatDateLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Formata data para DD/MM
 */
export function formatDateDisplay(dateStr: string): string {
  const normalizedDate = normalizeDateToYYYYMMDD(dateStr);
  const date = new Date(normalizedDate + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Prepara movimentações de contas_receber e contas_pagar para o cálculo
 */
export function prepararMovimentacoes(
  contasReceber: Array<{
    valor: number;
    data_vencimento: string;
    data_recebimento: string | null;
    status: string;
    conta_bancaria_id: string | null;
  }>,
  contasPagar: Array<{
    valor: number;
    data_vencimento: string;
    data_pagamento: string | null;
    status: string;
    conta_bancaria_id: string | null;
  }>
): MovimentacaoFluxo[] {
  const movimentacoes: MovimentacaoFluxo[] = [];

  // Processar contas a receber
  for (const conta of contasReceber) {
    const isPago = conta.status === 'pago';
    
    // Para pagos, usar data_recebimento. Para pendentes, usar data_vencimento
    // Normalizar para YYYY-MM-DD
    const dataMovimento = normalizeDateToYYYYMMDD(
      isPago && conta.data_recebimento 
        ? conta.data_recebimento 
        : conta.data_vencimento
    );
    
    movimentacoes.push({
      valor: conta.valor,
      data_movimento: dataMovimento,
      tipo: 'entrada',
      status: conta.status as 'pago' | 'pendente' | 'vencido',
      conta_bancaria_id: conta.conta_bancaria_id
    });
  }

  // Processar contas a pagar
  for (const conta of contasPagar) {
    const isPago = conta.status === 'pago';
    
    // Para pagos, usar data_pagamento. Para pendentes, usar data_vencimento
    // Normalizar para YYYY-MM-DD
    const dataMovimento = normalizeDateToYYYYMMDD(
      isPago && conta.data_pagamento 
        ? conta.data_pagamento 
        : conta.data_vencimento
    );
    
    movimentacoes.push({
      valor: conta.valor,
      data_movimento: dataMovimento,
      tipo: 'saida',
      status: conta.status as 'pago' | 'pendente' | 'vencido',
      conta_bancaria_id: conta.conta_bancaria_id
    });
  }

  return movimentacoes;
}
