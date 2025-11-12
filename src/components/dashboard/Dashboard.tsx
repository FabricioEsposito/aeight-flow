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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DateRangeFilter, DateRangePreset } from "@/components/financeiro/DateRangeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";

interface DashboardStats {
  faturamento: number;
  contasReceber: number;
  inadimplentes: number;
  contasPagar: number;
  pagarAtrasado: number;
  percentualInadimplentes: number;
  saldoInicial: number;
  saldoFinal: number;
}

interface FaturamentoData {
  month: string;
  valor: number;
}

interface FluxoCaixaData {
  date: string;
  saldoConta: number;
  recebido: number;
  pago: number;
  saldoFinal: number;
  saldoPrevisto?: number;
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
  });
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoData[]>([]);
  const [fluxoCaixaData, setFluxoCaixaData] = useState<FluxoCaixaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [datePreset, setDatePreset] = useState<DateRangePreset>('este-mes');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>();
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<string>('todos');
  const [selectedContaBancaria, setSelectedContaBancaria] = useState<string>('todas');
  const [centrosCusto, setCentrosCusto] = useState<Array<{ id: string; codigo: string; descricao: string }>>([]);
  const [contasBancarias, setContasBancarias] = useState<Array<{ id: string; descricao: string }>>([]);
  
  // Controle de visualização
  const [analiseAtiva, setAnaliseAtiva] = useState<'faturamento' | 'caixa'>('faturamento');

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [datePreset, customRange, selectedCentroCusto, selectedContaBancaria]);

  const getDateRange = () => {
    const today = new Date();
    let from: Date, to: Date;

    switch (datePreset) {
      case 'hoje':
        from = to = today;
        break;
      case 'esta-semana':
        from = startOfWeek(today, { weekStartsOn: 0 });
        to = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case 'este-mes':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'este-ano':
        from = startOfYear(today);
        to = endOfYear(today);
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

    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
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
        .select('id, descricao')
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

      // Fetch Contas a Receber
      let contasReceberQuery = supabase
        .from('contas_receber')
        .select('valor, data_vencimento, data_competencia, status, plano_conta_id, centro_custo');
      
      if (dateRange) {
        contasReceberQuery = contasReceberQuery
          .gte('data_competencia', dateRange.from)
          .lte('data_competencia', dateRange.to);
      }
      
      if (selectedCentroCusto !== 'todos') {
        contasReceberQuery = contasReceberQuery.eq('centro_custo', selectedCentroCusto);
      }

      const { data: contasReceber } = await contasReceberQuery;

      // Fetch Contas a Pagar
      let contasPagarQuery = supabase
        .from('contas_pagar')
        .select('valor, data_vencimento, data_competencia, status, centro_custo');
      
      if (dateRange) {
        contasPagarQuery = contasPagarQuery
          .gte('data_competencia', dateRange.from)
          .lte('data_competencia', dateRange.to);
      }
      
      if (selectedCentroCusto !== 'todos') {
        contasPagarQuery = contasPagarQuery.eq('centro_custo', selectedCentroCusto);
      }

      const { data: contasPagar } = await contasPagarQuery;

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
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento) < new Date(today);
          return c.status === 'pendente' && !isOverdue;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const inadimplentes = contasReceber
        ?.filter(c => {
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento) < new Date(today);
          return c.status === 'vencido' || (c.status === 'pendente' && isOverdue);
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const contasPagarTotal = contasPagar
        ?.filter(c => {
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento) < new Date(today);
          return c.status === 'pendente' && !isOverdue;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const pagarAtrasado = contasPagar
        ?.filter(c => {
          const isOverdue = c.data_vencimento && new Date(c.data_vencimento) < new Date(today);
          return c.status === 'vencido' || (c.status === 'pendente' && isOverdue);
        })
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      // Faturamento por mês (Receita de Serviços)
      const faturamentoReceitaServicos = contasReceber
        ?.filter(c => receitaServicosIds.includes(c.plano_conta_id || ''))
        .reduce((acc: Record<string, number>, c) => {
          if (c.data_competencia) {
            const month = new Date(c.data_competencia).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            acc[month] = (acc[month] || 0) + Number(c.valor);
          }
          return acc;
        }, {});

      const faturamentoChartData = Object.entries(faturamentoReceitaServicos || {}).map(([month, valor]) => ({
        month,
        valor: valor as number,
      }));

      setFaturamentoData(faturamentoChartData);

      // Fluxo de Caixa
      let contasBancariasQuery = supabase
        .from('contas_bancarias')
        .select('saldo_atual')
        .eq('status', 'ativo');
      
      if (selectedContaBancaria !== 'todas') {
        contasBancariasQuery = contasBancariasQuery.eq('id', selectedContaBancaria);
      }

      const { data: contasBancarias } = await contasBancariasQuery;
      const saldoContas = contasBancarias?.reduce((sum, c) => sum + Number(c.saldo_atual), 0) || 0;

      let movimentacoesQuery = supabase
        .from('movimentacoes')
        .select('data_movimento, tipo, valor')
        .order('data_movimento', { ascending: true });
      
      if (selectedContaBancaria !== 'todas') {
        movimentacoesQuery = movimentacoesQuery.eq('conta_bancaria_id', selectedContaBancaria);
      }
      
      if (dateRange) {
        movimentacoesQuery = movimentacoesQuery
          .gte('data_movimento', dateRange.from)
          .lte('data_movimento', dateRange.to);
      }

      const { data: movimentacoes } = await movimentacoesQuery;

      const fluxoPorDia: Record<string, { recebido: number; pago: number }> = {};
      
      movimentacoes?.forEach(m => {
        const date = m.data_movimento;
        if (!fluxoPorDia[date]) {
          fluxoPorDia[date] = { recebido: 0, pago: 0 };
        }
        if (m.tipo === 'entrada') {
          fluxoPorDia[date].recebido += Number(m.valor);
        } else {
          fluxoPorDia[date].pago += Number(m.valor);
        }
      });

      let saldoAcumulado = saldoContas;
      const fluxoChartData = Object.entries(fluxoPorDia).map(([date, valores]) => {
        const saldoFinal = saldoAcumulado + valores.recebido - valores.pago;
        const result = {
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          saldoConta: saldoAcumulado,
          recebido: valores.recebido,
          pago: valores.pago,
          saldoFinal: saldoFinal,
          saldoPrevisto: date > today ? saldoFinal : undefined,
        };
        saldoAcumulado = saldoFinal;
        return result;
      });

      setFluxoCaixaData(fluxoChartData);

      // Calcular saldos inicial e final
      const saldoInicial = contasBancarias?.reduce((sum, c) => sum + Number(c.saldo_atual), 0) || 0;
      const saldoFinal = saldoAcumulado;

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
            <Select value={selectedContaBancaria} onValueChange={setSelectedContaBancaria}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Conta Bancária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {contasBancarias.map((cb) => (
                  <SelectItem key={cb.id} value={cb.id}>
                    {cb.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      ) : (
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
            icon={Wallet}
            changeType="neutral"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Faturamento - Receita de Serviços</CardTitle>
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

        {/* Fluxo de Caixa Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                saldoFinal: {
                  label: "Saldo Final",
                  color: "hsl(var(--primary))",
                },
                saldoPrevisto: {
                  label: "Saldo Previsto",
                  color: "hsl(var(--muted-foreground))",
                },
              }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fluxoCaixaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="saldoFinal" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Saldo Final"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldoPrevisto" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Saldo Previsto"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}