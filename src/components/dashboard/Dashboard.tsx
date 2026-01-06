import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  CalendarDays,
  Wallet,
  LineChart as LineChartIcon,
  BarChart3
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart, Legend, ComposedChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DateRangeFilter, DateRangePreset } from "@/components/financeiro/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";
import { DREAnalysis } from "./DREAnalysis";
import { AnaliseCreditoClientes } from "./AnaliseCreditoClientes";
import { ReguaCobranca } from "./ReguaCobranca";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContaBancariaMultiSelect } from "@/components/financeiro/ContaBancariaMultiSelect";

interface DashboardStats {
  faturamento: number;
  contasReceber: number;
  inadimplentes: number;
  contasPagar: number;
  pagarAtrasado: number;
  percentualInadimplentes: number;
  saldoInicial: number;
  saldoFinal: number;
  saldoFinalPrevisto?: number;
  previsaoReceber: number;
  previsaoPagar: number;
  valorRecebido: number;
  valorPago: number;
}

interface FaturamentoData {
  month: string;
  valor: number;
}

interface FaturamentoClienteData {
  cliente: string;
  valor: number;
}

interface FluxoCaixaData {
  date: string;
  fullDate?: string;
  saldoConta: number;
  receitaRealizada: number;
  receitaPrevista: number;
  despesaRealizada: number;
  despesaPrevista: number;
  saldoFinal: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    faturamento: 0,
    contasReceber: 0,
    inadimplentes: 0,
    contasPagar: 0,
    pagarAtrasado: 0,
    percentualInadimplentes: 0,
    saldoInicial: 0,
    saldoFinal: 0,
    saldoFinalPrevisto: 0,
    previsaoReceber: 0,
    previsaoPagar: 0,
    valorRecebido: 0,
    valorPago: 0,
  });
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoData[]>([]);
  const [faturamentoClienteData, setFaturamentoClienteData] = useState<FaturamentoClienteData[]>([]);
  const [fluxoCaixaData, setFluxoCaixaData] = useState<FluxoCaixaData[]>([]);
  const [fluxoCaixaTabelaData, setFluxoCaixaTabelaData] = useState<FluxoCaixaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [datePreset, setDatePreset] = useState<DateRangePreset>('este-mes');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<string>('todos');
  const [selectedContaBancaria, setSelectedContaBancaria] = useState<string[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<Array<{ id: string; codigo: string; descricao: string }>>([]);
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; descricao: string; banco: string }>>([]);
  
  // Controle de visualização
  const [analiseAtiva, setAnaliseAtiva] = useState<'faturamento' | 'caixa' | 'dre' | 'credito' | 'cobranca'>('faturamento');

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [datePreset, customRange, selectedCentroCusto, selectedContaBancaria]);

  // Função auxiliar para formatar data sem problemas de timezone
  const formatDateLocal = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDateRange = () => {
    const today = new Date();
    let from: Date, to: Date;

    switch (datePreset) {
      case 'hoje':
        from = to = today;
        break;
      case 'esta-semana':
        from = startOfWeek(today, { weekStartsOn: 1 }); // Segunda-feira como primeiro dia
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'este-mes':
        from = startOfMonth(today); // Primeiro dia do mês
        to = endOfMonth(today); // Último dia do mês
        break;
      case 'este-ano':
        from = startOfYear(today); // 01/01 do ano
        to = endOfYear(today); // 31/12 do ano
        break;
      case 'ultimos-30-dias':
        from = subDays(today, 30);
        to = today;
        break;
      case 'ultimos-12-meses':
        from = subMonths(today, 12);
        to = today;
        break;
      case 'periodo-personalizado':
        if (customRange?.from && customRange?.to) {
          from = customRange.from;
          to = customRange.to;
        } else {
          return null;
        }
        break;
      case 'todo-periodo':
      default:
        return null;
    }

    return { from: formatDateLocal(from), to: formatDateLocal(to) };
  };

  const fetchFiltersData = async () => {
    try {
      // Fetch centros de custo
      const { data: centros } = await supabase
        .from('centros_custo')
        .select('id, codigo, descricao')
        .eq('status', 'ativo')
        .order('codigo');
      
      setCentrosCusto(centros || []);

      // Fetch contas bancárias
      const { data: contas } = await supabase
        .from('contas_bancarias')
        .select('id, descricao, banco')
        .eq('status', 'ativo')
        .order('descricao');
      
      setContasBancarias(contas || []);
    } catch (error) {
      console.error('Erro ao buscar dados dos filtros:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const dateRange = getDateRange();

      // Fetch Contas a Receber para Faturamento (pela data de competência)
      let contasReceberQuery = supabase
        .from('contas_receber')
        .select('valor, data_vencimento, data_competencia, data_recebimento, status, plano_conta_id, centro_custo, cliente_id, clientes(razao_social, nome_fantasia)');
      
      if (dateRange) {
        contasReceberQuery = contasReceberQuery
          .gte('data_competencia', dateRange.from)
          .lte('data_competencia', dateRange.to);
      }
      
      if (selectedCentroCusto !== 'todos') {
        contasReceberQuery = contasReceberQuery.eq('centro_custo', selectedCentroCusto);
      }

      const { data: contasReceber } = await contasReceberQuery;

      // Fetch Contas a Receber para Fluxo de Caixa (pagas + pendentes/vencidas para previsão)
      let contasReceberFluxoQuery = supabase
        .from('contas_receber')
        .select('valor, data_recebimento, data_vencimento, status, centro_custo, conta_bancaria_id');
      
      if (dateRange) {
        // Para contas pagas, filtrar pela data de recebimento
        // Para contas pendentes/vencidas, filtrar pela data de vencimento
        contasReceberFluxoQuery = contasReceberFluxoQuery.or(
          `and(status.eq.pago,data_recebimento.gte.${dateRange.from},data_recebimento.lte.${dateRange.to}),and(status.in.(pendente,vencido),data_vencimento.gte.${dateRange.from},data_vencimento.lte.${dateRange.to})`
        );
      } else {
        contasReceberFluxoQuery = contasReceberFluxoQuery.in('status', ['pago', 'pendente', 'vencido']);
      }
      
      if (selectedCentroCusto !== 'todos') {
        contasReceberFluxoQuery = contasReceberFluxoQuery.eq('centro_custo', selectedCentroCusto);
      }

      if (selectedContaBancaria.length > 0) {
        contasReceberFluxoQuery = contasReceberFluxoQuery.in('conta_bancaria_id', selectedContaBancaria);
      }

      const { data: contasReceberFluxo } = await contasReceberFluxoQuery;

      // Fetch Contas a Pagar para estatísticas (pela data de competência)
      let contasPagarQuery = supabase
        .from('contas_pagar')
        .select('valor, data_vencimento, data_competencia, data_pagamento, status, centro_custo');
      
      if (dateRange) {
        contasPagarQuery = contasPagarQuery
          .gte('data_competencia', dateRange.from)
          .lte('data_competencia', dateRange.to);
      }
      
      if (selectedCentroCusto !== 'todos') {
        contasPagarQuery = contasPagarQuery.eq('centro_custo', selectedCentroCusto);
      }

      const { data: contasPagar } = await contasPagarQuery;

      // Fetch Contas a Pagar para Fluxo de Caixa (pagas + pendentes/vencidas para previsão)
      let contasPagarFluxoQuery = supabase
        .from('contas_pagar')
        .select('valor, data_pagamento, data_vencimento, status, centro_custo, conta_bancaria_id');
      
      if (dateRange) {
        // Para contas pagas, filtrar pela data de pagamento
        // Para contas pendentes/vencidas, filtrar pela data de vencimento
        contasPagarFluxoQuery = contasPagarFluxoQuery.or(
          `and(status.eq.pago,data_pagamento.gte.${dateRange.from},data_pagamento.lte.${dateRange.to}),and(status.in.(pendente,vencido),data_vencimento.gte.${dateRange.from},data_vencimento.lte.${dateRange.to})`
        );
      } else {
        contasPagarFluxoQuery = contasPagarFluxoQuery.in('status', ['pago', 'pendente', 'vencido']);
      }
      
      if (selectedCentroCusto !== 'todos') {
        contasPagarFluxoQuery = contasPagarFluxoQuery.eq('centro_custo', selectedCentroCusto);
      }

      if (selectedContaBancaria.length > 0) {
        contasPagarFluxoQuery = contasPagarFluxoQuery.in('conta_bancaria_id', selectedContaBancaria);
      }

      const { data: contasPagarFluxo } = await contasPagarFluxoQuery;

      // Fetch Plano de Contas para filtrar Receita de Serviços
      const { data: planoContas } = await supabase
        .from('plano_contas')
        .select('id, codigo, descricao')
        .like('codigo', '1.1%');

      const receitaServicosIds = planoContas?.map(pc => pc.id) || [];

      // Calculate stats
      const faturamento = contasReceber
        ?.filter(c => c.data_competencia && (c.status === 'pendente' || c.status === 'vencido' || c.status === 'pago'))
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const contasReceberTotal = contasReceber
        ?.filter(c => {
          const todayDate = new Date(today + 'T00:00:00');
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento + 'T00:00:00') < todayDate;
          return c.status === 'pendente' && !isOverdue;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;
      
      // Previsão de recebimento (contas pendentes e em dia)
      const previsaoReceber = contasReceber
        ?.filter(c => {
          const todayDate = new Date(today + 'T00:00:00');
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento + 'T00:00:00') < todayDate;
          return c.status === 'pendente' && !isOverdue;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      // Previsão de pagamento (contas pendentes e em dia)
      const previsaoPagar = contasPagar
        ?.filter(c => {
          const todayDate = new Date(today + 'T00:00:00');
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento + 'T00:00:00') < todayDate;
          return c.status === 'pendente' && !isOverdue;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const inadimplentes = contasReceber
        ?.filter(c => {
          const todayDate = new Date(today + 'T00:00:00');
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento + 'T00:00:00') < todayDate;
          return c.status === 'vencido' || (c.status === 'pendente' && isOverdue);
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const contasPagarTotal = contasPagar
        ?.filter(c => {
          const todayDate = new Date(today + 'T00:00:00');
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento + 'T00:00:00') < todayDate;
          return c.status === 'pendente' && !isOverdue;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const pagarAtrasado = contasPagar
        ?.filter(c => {
          const todayDate = new Date(today + 'T00:00:00');
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento + 'T00:00:00') < todayDate;
          return c.status === 'vencido' || (c.status === 'pendente' && isOverdue);
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      // Faturamento por mês (Receita de Serviços)
      const faturamentoReceitaServicos = contasReceber
        ?.filter(c => receitaServicosIds.includes(c.plano_conta_id || ''))
        .reduce((acc: Record<string, { valor: number; date: Date }>, c) => {
          if (c.data_competencia) {
            const date = new Date(c.data_competencia + 'T00:00:00');
            const month = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            if (!acc[month]) {
              acc[month] = { valor: 0, date };
            }
            acc[month].valor += Number(c.valor);
          }
          return acc;
        }, {});

      const faturamentoChartData = Object.entries(faturamentoReceitaServicos || {})
        .map(([month, data]) => ({
          month,
          valor: data.valor,
          sortDate: data.date.getTime(),
        }))
        .sort((a, b) => a.sortDate - b.sortDate)
        .map(({ month, valor }) => ({ month, valor }));

      setFaturamentoData(faturamentoChartData);

      // Faturamento por Cliente (ordenado do maior para o menor)
      const faturamentoPorCliente = contasReceber
        ?.filter(c => c.data_competencia && (c.status === 'pendente' || c.status === 'vencido' || c.status === 'pago'))
        .reduce((acc: Record<string, { cliente: string; valor: number }>, c) => {
          const clienteId = c.cliente_id || 'sem_cliente';
          const clienteData = c.clientes as any;
          const clienteNome = clienteData?.nome_fantasia || clienteData?.razao_social || 'Sem Cliente';
          if (!acc[clienteId]) {
            acc[clienteId] = { cliente: clienteNome, valor: 0 };
          }
          acc[clienteId].valor += Number(c.valor);
          return acc;
        }, {});

      const faturamentoClienteChartData = Object.values(faturamentoPorCliente || {})
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10); // Top 10 clientes

      setFaturamentoClienteData(faturamentoClienteChartData);

      let contasBancariasQuery = supabase
        .from('contas_bancarias')
        .select('saldo_atual')
        .eq('status', 'ativo');
      
      if (selectedContaBancaria.length > 0) {
        contasBancariasQuery = contasBancariasQuery.in('id', selectedContaBancaria);
      }

      const { data: contasBancarias } = await contasBancariasQuery;
      const saldoContas = contasBancarias?.reduce((sum, c) => sum + Number(c.saldo_atual), 0) || 0;

      // Agregar dados de contas por data - separar realizados e previstos
      // Dados para a TABELA (todos os dias do período)
      const fluxoPorDiaTabela: Record<string, { receitaRealizada: number; receitaPrevista: number; despesaRealizada: number; despesaPrevista: number }> = {};
      // Dados para o GRÁFICO (apenas dias com movimentação)
      const fluxoPorDiaGrafico: Record<string, { receitaRealizada: number; receitaPrevista: number; despesaRealizada: number; despesaPrevista: number }> = {};
      
      // Gerar todos os dias do período selecionado para a tabela
      if (dateRange) {
        const startDate = new Date(dateRange.from + 'T00:00:00');
        const endDate = new Date(dateRange.to + 'T00:00:00');
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          const dateStr = formatDateLocal(currentDate);
          fluxoPorDiaTabela[dateStr] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // Adicionar contas recebidas (efetivamente pagas - realizado)
      contasReceberFluxo?.filter(c => c.status === 'pago' && c.data_recebimento).forEach(c => {
        const date = c.data_recebimento!;
        
        if (!fluxoPorDiaTabela[date]) {
          fluxoPorDiaTabela[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaTabela[date].receitaRealizada += Number(c.valor);
        
        if (!fluxoPorDiaGrafico[date]) {
          fluxoPorDiaGrafico[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaGrafico[date].receitaRealizada += Number(c.valor);
      });

      // Adicionar contas pagas (efetivamente pagas - realizado)
      contasPagarFluxo?.filter(c => c.status === 'pago' && c.data_pagamento).forEach(c => {
        const date = c.data_pagamento!;
        
        if (!fluxoPorDiaTabela[date]) {
          fluxoPorDiaTabela[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaTabela[date].despesaRealizada += Number(c.valor);
        
        if (!fluxoPorDiaGrafico[date]) {
          fluxoPorDiaGrafico[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaGrafico[date].despesaRealizada += Number(c.valor);
      });
      
      const hojeStr = formatDateLocal(new Date());

      // Adicionar previsões (APENAS contas pendentes e NÃO vencidas - vencidos ficam só nos cards)
      // Regra: previsão só considera vencimentos de hoje em diante
      contasReceberFluxo?.filter(c => c.status === 'pendente' && c.data_vencimento && c.data_vencimento >= hojeStr).forEach(c => {
        const date = c.data_vencimento!;
        
        if (!fluxoPorDiaTabela[date]) {
          fluxoPorDiaTabela[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaTabela[date].receitaPrevista += Number(c.valor);
        
        if (!fluxoPorDiaGrafico[date]) {
          fluxoPorDiaGrafico[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaGrafico[date].receitaPrevista += Number(c.valor);
      });

      contasPagarFluxo?.filter(c => c.status === 'pendente' && c.data_vencimento && c.data_vencimento >= hojeStr).forEach(c => {
        const date = c.data_vencimento!;
        
        if (!fluxoPorDiaTabela[date]) {
          fluxoPorDiaTabela[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaTabela[date].despesaPrevista += Number(c.valor);
        
        if (!fluxoPorDiaGrafico[date]) {
          fluxoPorDiaGrafico[date] = { receitaRealizada: 0, receitaPrevista: 0, despesaRealizada: 0, despesaPrevista: 0 };
        }
        fluxoPorDiaGrafico[date].despesaPrevista += Number(c.valor);
      });

      // Dados para o GRÁFICO (apenas dias com movimentação)
      const sortedDatesGrafico = Object.keys(fluxoPorDiaGrafico).sort();
      let saldoAcumuladoGrafico = saldoContas;
      
      const fluxoChartData = sortedDatesGrafico.map(date => {
        const valores = fluxoPorDiaGrafico[date];
        const receitaTotal = valores.receitaRealizada + valores.receitaPrevista;
        const despesaTotal = valores.despesaRealizada + valores.despesaPrevista;
        saldoAcumuladoGrafico = saldoAcumuladoGrafico + receitaTotal - despesaTotal;
        
        return {
          date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          fullDate: date,
          saldoConta: saldoContas,
          receitaRealizada: valores.receitaRealizada,
          receitaPrevista: valores.receitaPrevista,
          despesaRealizada: valores.despesaRealizada,
          despesaPrevista: valores.despesaPrevista,
          saldoFinal: saldoAcumuladoGrafico,
        };
      });

      // Dados para a TABELA (todos os dias do período)
      const sortedDatesTabela = Object.keys(fluxoPorDiaTabela).sort();
      let saldoAcumuladoTabela = saldoContas;
      
      const fluxoTabelaData = sortedDatesTabela.map(date => {
        const valores = fluxoPorDiaTabela[date];
        const receitaTotal = valores.receitaRealizada + valores.receitaPrevista;
        const despesaTotal = valores.despesaRealizada + valores.despesaPrevista;
        saldoAcumuladoTabela = saldoAcumuladoTabela + receitaTotal - despesaTotal;
        
        return {
          date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          fullDate: date,
          saldoConta: saldoContas,
          receitaRealizada: valores.receitaRealizada,
          receitaPrevista: valores.receitaPrevista,
          despesaRealizada: valores.despesaRealizada,
          despesaPrevista: valores.despesaPrevista,
          saldoFinal: saldoAcumuladoTabela,
        };
      });

      setFluxoCaixaData(fluxoChartData);
      setFluxoCaixaTabelaData(fluxoTabelaData);

      // Calcular saldos inicial e final (último dia útil do mês)
      const saldoInicial = contasBancarias?.reduce((sum, c) => sum + Number(c.saldo_atual), 0) || 0;
      const ultimoDia = fluxoChartData.length > 0 ? fluxoChartData[fluxoChartData.length - 1] : null;
      const saldoFinal = ultimoDia ? ultimoDia.saldoFinal : saldoInicial;
      const saldoFinalPrevisto = saldoFinal; // Agora saldoFinal já inclui previsões (pendentes)

      // Calcular valores efetivamente recebidos e pagos no período
      const valorRecebido = contasReceberFluxo
        ?.filter(c => c.status === 'pago' && c.data_recebimento)
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const valorPago = contasPagarFluxo
        ?.filter(c => c.status === 'pago' && c.data_pagamento)
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      // Calcular percentual de inadimplentes
      const percentualInadimplentes = faturamento > 0 ? (inadimplentes / faturamento) * 100 : 0;

      // Atualizar stats com todos os valores
      setStats({
        faturamento,
        contasReceber: contasReceberTotal,
        inadimplentes,
        contasPagar: contasPagarTotal,
        pagarAtrasado,
        percentualInadimplentes,
        saldoInicial,
        saldoFinal,
        saldoFinalPrevisto,
        previsaoReceber,
        previsaoPagar,
        valorRecebido,
        valorPago,
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu negócio</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu negócio</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/50">
              <button
                onClick={() => setAnaliseAtiva('faturamento')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  analiseAtiva === 'faturamento'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Faturamento
              </button>
              <button
                onClick={() => setAnaliseAtiva('caixa')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  analiseAtiva === 'caixa'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LineChartIcon className="w-4 h-4" />
                Caixa
              </button>
              <button
                onClick={() => setAnaliseAtiva('dre')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  analiseAtiva === 'dre'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                DRE
              </button>
              <button
                onClick={() => setAnaliseAtiva('credito')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  analiseAtiva === 'credito'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Crédito
              </button>
              <button
                onClick={() => setAnaliseAtiva('cobranca')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  analiseAtiva === 'cobranca'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Cobrança
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              Última atualização: agora
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <DateRangeFilter
            value={datePreset}
            onChange={(preset, range) => {
              setDatePreset(preset);
              if (range) setCustomRange(range);
            }}
            customRange={customRange}
          />

          <Select value={selectedCentroCusto} onValueChange={setSelectedCentroCusto}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Centro de Custo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os centros de custo</SelectItem>
              {centrosCusto.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.codigo} - {cc.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {analiseAtiva === 'caixa' && (
            <ContaBancariaMultiSelect
              contas={contasBancarias}
              selectedIds={selectedContaBancaria}
              onChange={setSelectedContaBancaria}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {analiseAtiva === 'faturamento' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Faturamento"
            value={formatCurrency(stats.faturamento)}
            icon={DollarSign}
            changeType="neutral"
          />
          <StatsCard
            title="Contas a Receber"
            value={formatCurrency(stats.contasReceber)}
            icon={TrendingUp}
            changeType="neutral"
            subtitle={stats.previsaoReceber > 0 ? `Previsão: ${formatCurrency(stats.previsaoReceber)}` : undefined}
          />
          <StatsCard
            title="Inadimplentes"
            value={formatCurrency(stats.inadimplentes)}
            icon={AlertTriangle}
            changeType={stats.inadimplentes > 0 ? "negative" : "neutral"}
          />
          <StatsCard
            title="% Inadimplentes"
            value={`${stats.percentualInadimplentes.toFixed(2)}%`}
            icon={AlertTriangle}
            changeType={stats.percentualInadimplentes > 5 ? "negative" : "neutral"}
          />
        </div>
      ) : analiseAtiva === 'caixa' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Saldo Inicial"
            value={formatCurrency(stats.saldoInicial)}
            icon={Wallet}
            changeType="neutral"
          />
          <StatsCard
            title="Contas a Pagar"
            value={formatCurrency(stats.contasPagar)}
            icon={TrendingDown}
            changeType="neutral"
            subtitle={`Pago: ${formatCurrency(stats.valorPago)}${stats.previsaoPagar > 0 ? ` | Previsão: ${formatCurrency(stats.previsaoPagar)}` : ''}`}
          />
          <StatsCard
            title="À Pagar Atrasado"
            value={formatCurrency(stats.pagarAtrasado)}
            icon={AlertTriangle}
            changeType={stats.pagarAtrasado > 0 ? "negative" : "neutral"}
          />
          <StatsCard
            title="Contas a Receber"
            value={formatCurrency(stats.contasReceber)}
            icon={TrendingUp}
            changeType="neutral"
            subtitle={`Recebido: ${formatCurrency(stats.valorRecebido)}${stats.previsaoReceber > 0 ? ` | Previsão: ${formatCurrency(stats.previsaoReceber)}` : ''}`}
          />
          <StatsCard
            title="Inadimplentes"
            value={formatCurrency(stats.inadimplentes)}
            icon={AlertTriangle}
            changeType={stats.inadimplentes > 0 ? "negative" : "neutral"}
          />
          <StatsCard
            title="Saldo Final"
            value={formatCurrency(stats.saldoFinal)}
            subtitle={stats.saldoFinalPrevisto ? `Previsto: ${formatCurrency(stats.saldoFinalPrevisto)}` : undefined}
            icon={Wallet}
            changeType="neutral"
          />
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Faturamento Charts - Apenas em Análise de Faturamento */}
        {analiseAtiva === 'faturamento' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    valor: {
                      label: "Faturamento",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-80"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={faturamentoData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Cliente (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    valor: {
                      label: "Faturamento",
                      color: "hsl(142, 76%, 36%)",
                    },
                  }}
                  className="h-80"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={faturamentoClienteData} 
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis 
                        type="category" 
                        dataKey="cliente" 
                        width={150}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-medium">{payload[0]?.payload?.cliente}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {formatCurrency(payload[0]?.value as number)}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="valor" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fluxo de Caixa Chart - Apenas em Análise de Caixa */}
        {analiseAtiva === 'caixa' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Fluxo de Caixa Diário</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    receitaRealizada: {
                      label: "Receita Realizada",
                      color: "hsl(142, 76%, 36%)",
                    },
                    receitaPrevista: {
                      label: "Receita Prevista",
                      color: "hsl(142, 76%, 60%)",
                    },
                    despesaRealizada: {
                      label: "Despesa Realizada",
                      color: "hsl(0, 84%, 60%)",
                    },
                    despesaPrevista: {
                      label: "Despesa Prevista",
                      color: "hsl(0, 84%, 80%)",
                    },
                    saldoFinal: {
                      label: "Saldo",
                      color: "hsl(47, 96%, 53%)",
                    },
                  }}
                  className="h-80"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fluxoCaixaData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {payload[0]?.payload?.date}
                                    </span>
                                  </div>
                                  {payload.map((entry: any) => (
                                    <div key={entry.name} className="flex items-center gap-2">
                                      <div 
                                        className="h-2 w-2 rounded-full" 
                                        style={{ backgroundColor: entry.color }}
                                      />
                                      <span className="text-[0.70rem] text-muted-foreground">
                                        {entry.name}:
                                      </span>
                                      <span className="font-bold">
                                        {formatCurrency(entry.value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="receitaRealizada" 
                        fill="hsl(142, 76%, 36%)" 
                        radius={[4, 4, 0, 0]}
                        name="Receita Realizada"
                        stackId="receita"
                      />
                      <Bar 
                        dataKey="receitaPrevista" 
                        fill="hsl(142, 76%, 60%)" 
                        radius={[4, 4, 0, 0]}
                        name="Receita Prevista"
                        stackId="receita"
                        opacity={0.7}
                      />
                      <Bar 
                        dataKey="despesaRealizada" 
                        fill="hsl(0, 84%, 60%)" 
                        radius={[4, 4, 0, 0]}
                        name="Despesa Realizada"
                        stackId="despesa"
                      />
                      <Bar 
                        dataKey="despesaPrevista" 
                        fill="hsl(0, 84%, 80%)" 
                        radius={[4, 4, 0, 0]}
                        name="Despesa Prevista"
                        stackId="despesa"
                        opacity={0.7}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="saldoFinal" 
                        stroke="hsl(47, 96%, 53%)" 
                        strokeWidth={3}
                        name="Saldo"
                        dot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Tabela de Fluxo Diário */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Resumo Diário</span>
                </CardTitle>
                {/* Legenda */}
                <div className="flex flex-wrap gap-4 text-xs mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Receita:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
                      <span className="text-muted-foreground">Realizado</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded opacity-70" style={{ backgroundColor: 'hsl(142, 76%, 60%)' }} />
                      <span className="text-muted-foreground">Previsto</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Despesa:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }} />
                      <span className="text-muted-foreground">Realizado</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded opacity-70" style={{ backgroundColor: 'hsl(0, 84%, 80%)' }} />
                      <span className="text-muted-foreground">Previsto</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-80">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left p-2 text-xs font-semibold">Dia</th>
                        <th className="text-right p-2 text-xs font-semibold">Receita</th>
                        <th className="text-right p-2 text-xs font-semibold">Despesa</th>
                        <th className="text-right p-2 text-xs font-semibold">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluxoCaixaTabelaData.map((item, index) => {
                        const receitaTotal = item.receitaRealizada + item.receitaPrevista;
                        const despesaTotal = item.despesaRealizada + item.despesaPrevista;
                        const temReceitaPrevista = item.receitaPrevista > 0;
                        const temDespesaPrevista = item.despesaPrevista > 0;
                        
                        return (
                          <tr key={index} className="border-b border-border hover:bg-muted/50">
                            <td className="p-2 text-xs">{item.date}</td>
                            <td className="p-2 text-xs text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                {item.receitaRealizada > 0 && (
                                  <span className="font-medium" style={{ color: 'hsl(142, 76%, 36%)' }}>
                                    {formatCurrency(item.receitaRealizada)}
                                  </span>
                                )}
                                {temReceitaPrevista && (
                                  <span className="font-medium opacity-70" style={{ color: 'hsl(142, 76%, 50%)' }}>
                                    {formatCurrency(item.receitaPrevista)}
                                  </span>
                                )}
                                {!item.receitaRealizada && !temReceitaPrevista && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-xs text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                {item.despesaRealizada > 0 && (
                                  <span className="font-medium" style={{ color: 'hsl(0, 84%, 60%)' }}>
                                    {formatCurrency(item.despesaRealizada)}
                                  </span>
                                )}
                                {temDespesaPrevista && (
                                  <span className="font-medium opacity-70" style={{ color: 'hsl(0, 84%, 70%)' }}>
                                    {formatCurrency(item.despesaPrevista)}
                                  </span>
                                )}
                                {!item.despesaRealizada && !temDespesaPrevista && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                            <td className={`p-2 text-xs text-right font-bold ${
                              item.saldoFinal >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                            }`}>
                              {formatCurrency(item.saldoFinal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DRE Analysis */}
        {analiseAtiva === 'dre' && (
          <DREAnalysis 
            dateRange={(() => {
              const range = getDateRange();
              if (!range) return null;
              return {
                from: new Date(range.from),
                to: new Date(range.to)
              };
            })()}
            centroCusto={selectedCentroCusto !== 'todos' ? selectedCentroCusto : undefined}
          />
        )}

        {/* Análise de Crédito */}
        {analiseAtiva === 'credito' && (
          <div className="space-y-6">
            <AnaliseCreditoClientes />
          </div>
        )}

        {/* Régua de Cobrança */}
        {analiseAtiva === 'cobranca' && (
          <div className="space-y-6">
            <ReguaCobranca 
              dataInicio={(() => {
                const range = getDateRange();
                return range?.from || '';
              })()}
              dataFim={(() => {
                const range = getDateRange();
                return range?.to || '';
              })()}
              centroCusto={selectedCentroCusto !== 'todos' ? selectedCentroCusto : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}