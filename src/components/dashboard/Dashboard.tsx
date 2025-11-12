import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  CalendarDays,
  Wallet
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, LineChart, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DashboardStats {
  faturamento: number;
  contasReceber: number;
  inadimplentes: number;
  contasPagar: number;
  pagarAtrasado: number;
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
  });
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoData[]>([]);
  const [fluxoCaixaData, setFluxoCaixaData] = useState<FluxoCaixaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch Contas a Receber
      const { data: contasReceber } = await supabase
        .from('contas_receber')
        .select('valor, data_vencimento, data_competencia, status, plano_conta_id');

      // Fetch Contas a Pagar
      const { data: contasPagar } = await supabase
        .from('contas_pagar')
        .select('valor, data_vencimento, status');

      // Fetch Plano de Contas para filtrar Receita de Serviços
      const { data: planoContas } = await supabase
        .from('plano_contas')
        .select('id, codigo, descricao')
        .like('codigo', '1.1%');

      const receitaServicosIds = planoContas?.map(pc => pc.id) || [];

      // Calculate stats
      const faturamento = contasReceber
        ?.filter(c => c.data_competencia)
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const contasReceberTotal = contasReceber
        ?.filter(c => c.status === 'pendente' || c.status === 'vencido')
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const inadimplentes = contasReceber
        ?.filter(c => c.status === 'vencido')
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const contasPagarTotal = contasPagar
        ?.filter(c => c.status === 'pendente' || c.status === 'vencido')
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      const pagarAtrasado = contasPagar
        ?.filter(c => c.status === 'vencido')
        .reduce((sum, c) => sum + Number(c.valor), 0) || 0;

      setStats({
        faturamento,
        contasReceber: contasReceberTotal,
        inadimplentes,
        contasPagar: contasPagarTotal,
        pagarAtrasado,
      });

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
      const { data: contasBancarias } = await supabase
        .from('contas_bancarias')
        .select('saldo_atual')
        .eq('status', 'ativo');

      const saldoContas = contasBancarias?.reduce((sum, c) => sum + Number(c.saldo_atual), 0) || 0;

      const { data: movimentacoes } = await supabase
        .from('movimentacoes')
        .select('data_movimento, tipo, valor')
        .order('data_movimento', { ascending: true });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          Última atualização: agora
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
          title="Contas a Pagar"
          value={formatCurrency(stats.contasPagar)}
          icon={TrendingDown}
          changeType="neutral"
        />
        <StatsCard
          title="À Pagar Atrasado"
          value={formatCurrency(stats.pagarAtrasado)}
          icon={Wallet}
          changeType={stats.pagarAtrasado > 0 ? "negative" : "neutral"}
        />
      </div>

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