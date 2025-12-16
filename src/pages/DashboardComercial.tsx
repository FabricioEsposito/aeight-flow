import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vendedor {
  id: string;
  nome: string;
  meta: number;
  percentual_comissao: number;
}

interface Contrato {
  id: string;
  vendedor_responsavel: string | null;
  valor_total: number;
  cliente_id: string | null;
  created_at: string;
  clientes?: { razao_social: string; nome_fantasia: string | null } | null;
}

interface VendaVendedor {
  nome: string;
  valor: number;
  meta: number;
  percentual: number;
}

interface VendaCliente {
  nome: string;
  valor: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function DashboardComercial() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes_atual");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [periodo]);

  const getDateRange = () => {
    const now = new Date();
    switch (periodo) {
      case "mes_atual":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "mes_anterior":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "ano_atual":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      const [vendedoresRes, contratosRes] = await Promise.all([
        supabase.from("vendedores").select("*").eq("status", "ativo"),
        supabase
          .from("contratos")
          .select("id, vendedor_responsavel, valor_total, cliente_id, created_at, clientes(razao_social, nome_fantasia)")
          .gte("created_at", startStr)
          .lte("created_at", endStr + "T23:59:59")
          .eq("tipo_contrato", "venda"),
      ]);

      if (vendedoresRes.error) throw vendedoresRes.error;
      if (contratosRes.error) throw contratosRes.error;

      setVendedores(vendedoresRes.data || []);
      setContratos(contratosRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { vendasPorVendedor, vendasPorCliente, totalVendas, totalMeta, vendedorDestaque } = useMemo(() => {
    const vendedorMap = new Map<string, VendaVendedor>();
    const clienteMap = new Map<string, VendaCliente>();

    // Inicializa vendedores
    vendedores.forEach((v) => {
      vendedorMap.set(v.id, {
        nome: v.nome,
        valor: 0,
        meta: v.meta,
        percentual: 0,
      });
    });

    let total = 0;

    contratos.forEach((contrato) => {
      total += contrato.valor_total;

      // Vendas por vendedor
      if (contrato.vendedor_responsavel) {
        const vendedor = vendedorMap.get(contrato.vendedor_responsavel);
        if (vendedor) {
          vendedor.valor += contrato.valor_total;
        }
      }

      // Vendas por cliente
      if (contrato.clientes) {
        const clienteNome = contrato.clientes.nome_fantasia || contrato.clientes.razao_social;
        const existing = clienteMap.get(clienteNome);
        if (existing) {
          existing.valor += contrato.valor_total;
        } else {
          clienteMap.set(clienteNome, { nome: clienteNome, valor: contrato.valor_total });
        }
      }
    });

    // Calcula percentuais
    const vendasVendedor = Array.from(vendedorMap.values())
      .map((v) => ({
        ...v,
        percentual: total > 0 ? (v.valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    const vendasCliente = Array.from(clienteMap.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    const totalMetaCalc = vendedores.reduce((acc, v) => acc + v.meta, 0);
    const destaque = vendasVendedor[0];

    return {
      vendasPorVendedor: vendasVendedor,
      vendasPorCliente: vendasCliente,
      totalVendas: total,
      totalMeta: totalMetaCalc,
      vendedorDestaque: destaque,
    };
  }, [vendedores, contratos]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const percentualMeta = totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Comercial</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho da equipe de vendas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label>Período:</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                <SelectItem value="ano_atual">Ano Atual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalVendas)}</div>
              <p className="text-xs text-muted-foreground">
                {percentualMeta.toFixed(1)}% da meta geral
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta Geral</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMeta)}</div>
              <p className="text-xs text-muted-foreground">
                Soma das metas dos vendedores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendedores.length}</div>
              <p className="text-xs text-muted-foreground">
                Equipe de vendas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedor Destaque</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {vendedorDestaque?.nome || "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {vendedorDestaque ? formatCurrency(vendedorDestaque.valor) : "-"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Vendas por Vendedor */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendasPorVendedor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="nome" width={100} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => label}
                  />
                  <Legend />
                  <Bar dataKey="valor" name="Vendas" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="meta" name="Meta" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Percentual de Venda por Vendedor */}
          <Card>
            <CardHeader>
              <CardTitle>Percentual de Vendas por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vendasPorVendedor.filter((v) => v.valor > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="valor"
                  >
                    {vendasPorVendedor.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vendas por Cliente */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top 10 Clientes por Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendasPorCliente}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="valor" name="Vendas" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabela de desempenho */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Desempenho Individual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Vendedor</th>
                      <th className="text-right py-2 px-4">Vendas</th>
                      <th className="text-right py-2 px-4">Meta</th>
                      <th className="text-right py-2 px-4">% da Meta</th>
                      <th className="text-right py-2 px-4">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasPorVendedor.map((v) => {
                      const percentMeta = v.meta > 0 ? (v.valor / v.meta) * 100 : 0;
                      return (
                        <tr key={v.nome} className="border-b">
                          <td className="py-2 px-4">{v.nome}</td>
                          <td className="text-right py-2 px-4">{formatCurrency(v.valor)}</td>
                          <td className="text-right py-2 px-4">{formatCurrency(v.meta)}</td>
                          <td className="text-right py-2 px-4">
                            <span
                              className={
                                percentMeta >= 100
                                  ? "text-green-600"
                                  : percentMeta >= 70
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }
                            >
                              {percentMeta.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-right py-2 px-4">{v.percentual.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
