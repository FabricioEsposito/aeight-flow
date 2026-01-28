import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from "date-fns";
import { DateRangeFilter, DateRangePreset } from "@/components/financeiro/DateRangeFilter";
import { CentroCustoFilterSelect } from "@/components/financeiro/CentroCustoFilterSelect";
import { CompanyTag } from "@/components/centro-custos/CompanyBadge";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";

interface Vendedor {
  id: string;
  nome: string;
  meta: number;
  percentual_comissao: number;
  centro_custo: string | null;
  centros_vinculados?: { centro_custo_id: string; codigo: string; descricao: string; meta: number }[];
}

interface Contrato {
  id: string;
  vendedor_responsavel: string | null;
  valor_total: number;
  cliente_id: string | null;
  created_at: string;
  centro_custo: string | null;
  clientes?: { razao_social: string; nome_fantasia: string | null } | null;
}

interface VendaVendedor {
  nome: string;
  valor: number;
  meta: number;
  percentual: number;
  centro_custo: string | null;
  centros_vinculados?: { centro_custo_id: string; codigo: string; descricao: string; meta: number }[];
}

interface CentroCusto {
  id: string;
  codigo: string;
  descricao: string;
}

interface VendaCliente {
  nome: string;
  valor: number;
}

interface VendaCentroCusto {
  id: string;
  codigo: string;
  descricao: string;
  valor: number;
  percentual: number;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const truncateLabel = (value: unknown, max = 16) => {
  const s = String(value ?? "");
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + "…";
};

export default function DashboardComercial() {
  const { user } = useAuth();
  const { isSalesperson, loading: roleLoading } = useUserRole();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [userVendedorId, setUserVendedorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("este-mes");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<string>("");
  const { toast } = useToast();

  // Fetch user's vendedor_id from profile
  useEffect(() => {
    const fetchUserVendedor = async () => {
      if (!user || !isSalesperson) {
        setUserVendedorId(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("vendedor_id")
        .eq("id", user.id)
        .single();

      if (!error && data?.vendedor_id) {
        setUserVendedorId(data.vendedor_id);
      }
    };

    if (!roleLoading) {
      fetchUserVendedor();
    }
  }, [user, isSalesperson, roleLoading]);

  useEffect(() => {
    // Wait for role check to complete for salespeople
    if (roleLoading) return;
    if (isSalesperson && userVendedorId === null) return; // Still loading vendedor_id
    fetchData();
  }, [dateRangePreset, customDateRange, selectedCentroCusto, roleLoading, isSalesperson, userVendedorId]);

  const getDateRange = (): { start: Date; end: Date } | null => {
    const today = new Date();

    if (dateRangePreset === 'periodo-personalizado' && customDateRange.from && customDateRange.to) {
      return { start: customDateRange.from, end: customDateRange.to };
    }

    switch (dateRangePreset) {
      case 'hoje':
        return { start: today, end: today };
      case 'esta-semana':
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'este-mes':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'este-ano':
        return { start: startOfYear(today), end: endOfYear(today) };
      case 'ultimos-30-dias':
        return { start: subDays(today, 30), end: today };
      case 'ultimos-12-meses':
        return { start: subMonths(today, 12), end: today };
      case 'todo-periodo':
        return null;
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  };

  const handleDateRangeChange = (preset: DateRangePreset, range?: DateRange) => {
    setDateRangePreset(preset);
    if (range) {
      setCustomDateRange(range);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();

      // Fetch centros_custo
      const centrosCustoRes = await supabase
        .from("centros_custo")
        .select("id, codigo, descricao");

      // Fetch all vendedores_centros_custo to know which centers each vendedor is linked to
      const { data: vendedoresCentros } = await (supabase as any)
        .from("vendedores_centros_custo")
        .select("vendedor_id, centro_custo_id, meta, percentual_comissao");

      // Fetch vendedores - filter for salesperson role or by linked centers
      let vendedoresQuery = (supabase as any).from("vendedores").select("*").eq("status", "ativo").eq("is_merged", false);
      if (isSalesperson && userVendedorId) {
        vendedoresQuery = vendedoresQuery.eq("id", userVendedorId);
      } else if (selectedCentroCusto) {
        // Find vendedor IDs linked to this centro_custo
        const vendedorIdsForCenter = (vendedoresCentros || [])
          .filter((vc: any) => vc.centro_custo_id === selectedCentroCusto)
          .map((vc: any) => vc.vendedor_id);
        if (vendedorIdsForCenter.length > 0) {
          vendedoresQuery = vendedoresQuery.in("id", vendedorIdsForCenter);
        } else {
          // Fallback to legacy centro_custo field
          vendedoresQuery = vendedoresQuery.eq("centro_custo", selectedCentroCusto);
        }
      }
      const vendedoresRes = await vendedoresQuery;

      // Enrich vendedores with their linked centros
      const centrosMap = new Map((centrosCustoRes.data || []).map((c: any) => [c.id, c]));
      const enrichedVendedores: Vendedor[] = (vendedoresRes.data || []).map((v: any) => {
        const linkedCenters = (vendedoresCentros || [])
          .filter((vc: any) => vc.vendedor_id === v.id)
          .map((vc: any) => {
            const cc = centrosMap.get(vc.centro_custo_id);
            return {
              centro_custo_id: vc.centro_custo_id,
              codigo: cc?.codigo || "",
              descricao: cc?.descricao || "",
              meta: vc.meta || 0,
            };
          });
        // Sum metas from linked centers if available, otherwise use vendedor.meta
        const totalMeta = linkedCenters.length > 0 
          ? linkedCenters.reduce((acc: number, lc: any) => acc + lc.meta, 0)
          : v.meta;
        return {
          ...v,
          meta: totalMeta,
          centros_vinculados: linkedCenters,
        };
      });

      // NOVA LÓGICA: Buscar vendas baseadas em PARCELAS (contas_receber) no período
      // Em vez de filtrar por data de criação do contrato, filtramos pelas parcelas
      // que têm data_competencia no período selecionado
      
      // 1. Buscar todos os contratos de venda (sem filtro de data)
      let contratosQuery = supabase
        .from("contratos")
        .select("id, vendedor_responsavel, valor_total, cliente_id, created_at, centro_custo, clientes(razao_social, nome_fantasia)")
        .eq("tipo_contrato", "venda");

      // Salesperson: filter by vendedor
      if (isSalesperson && userVendedorId) {
        const legacyName = (vendedoresRes.data?.[0]?.nome || "").trim();
        contratosQuery = legacyName
          ? contratosQuery.or(`vendedor_responsavel.eq.${userVendedorId},vendedor_responsavel.eq.${legacyName}`)
          : contratosQuery.eq("vendedor_responsavel", userVendedorId);
      }

      if (selectedCentroCusto && !isSalesperson) {
        contratosQuery = contratosQuery.eq("centro_custo", selectedCentroCusto);
      }

      const contratosRes = await contratosQuery;

      if (vendedoresRes.error) throw vendedoresRes.error;
      if (contratosRes.error) throw contratosRes.error;

      // 2. Buscar parcelas dos contratos filtradas pela data de competência
      const contratoIds = (contratosRes.data || []).map((c: any) => c.id);
      let parcelasData: any[] = [];
      
      if (contratoIds.length > 0) {
        // Buscar parcelas vinculadas aos contratos
        const { data: parcelas } = await supabase
          .from("parcelas_contrato")
          .select("id, contrato_id, valor")
          .in("contrato_id", contratoIds);

        const parcelaIds = (parcelas || []).map((p: any) => p.id);

        if (parcelaIds.length > 0) {
          // Buscar contas a receber dessas parcelas filtradas por data_competencia
          let contasReceberQuery = supabase
            .from("contas_receber")
            .select("id, parcela_id, valor, data_competencia, cliente_id")
            .in("parcela_id", parcelaIds);

          if (dateRange) {
            const startStr = format(dateRange.start, "yyyy-MM-dd");
            const endStr = format(dateRange.end, "yyyy-MM-dd");
            contasReceberQuery = contasReceberQuery
              .gte("data_competencia", startStr)
              .lte("data_competencia", endStr);
          }

          const { data: contasReceber } = await contasReceberQuery;

          // Mapear parcelas para seus contratos
          const parcelaToContrato = new Map((parcelas || []).map((p: any) => [p.id, p.contrato_id]));
          
          // Agrupar valores por contrato baseado nas parcelas do período
          const contratoValoresPeriodo = new Map<string, number>();
          (contasReceber || []).forEach((cr: any) => {
            const contratoId = parcelaToContrato.get(cr.parcela_id);
            if (contratoId) {
              contratoValoresPeriodo.set(
                contratoId,
                (contratoValoresPeriodo.get(contratoId) || 0) + cr.valor
              );
            }
          });

          // Criar lista de "contratos virtuais" representando vendas do período
          parcelasData = Array.from(contratoValoresPeriodo.entries()).map(([contratoId, valorPeriodo]) => {
            const contrato = contratosRes.data?.find((c: any) => c.id === contratoId);
            return {
              id: contratoId,
              vendedor_responsavel: contrato?.vendedor_responsavel,
              valor_total: valorPeriodo, // Usar valor das parcelas do período
              cliente_id: contrato?.cliente_id,
              created_at: contrato?.created_at,
              centro_custo: contrato?.centro_custo,
              clientes: contrato?.clientes,
            };
          });
        }
      }

      setCentrosCusto(centrosCustoRes.data || []);
      setVendedores(enrichedVendedores);
      setContratos(parcelasData); // Usar dados baseados em parcelas do período
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

  const { vendasPorVendedor, vendasPorCliente, vendasPorCentroCusto, totalVendas, totalMeta, vendedorDestaque, ticketMedio, quantidadeContratos } = useMemo(() => {
    const vendedorMap = new Map<string, VendaVendedor>();
    const clienteMap = new Map<string, VendaCliente>();
    const centroMap = new Map<string, number>();

    // Inicializa vendedores
    vendedores.forEach((v) => {
      vendedorMap.set(v.id, {
        nome: v.nome,
        valor: 0,
        meta: v.meta,
        percentual: 0,
        centro_custo: v.centro_custo,
        centros_vinculados: v.centros_vinculados,
      });
    });

    let total = 0;

    contratos.forEach((contrato) => {
      total += contrato.valor_total;

      // Vendas por centro de custo (p/ vendedores e também útil para gestores)
      if (contrato.centro_custo) {
        centroMap.set(
          contrato.centro_custo,
          (centroMap.get(contrato.centro_custo) || 0) + contrato.valor_total
        );
      }

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

    const vendasCC: VendaCentroCusto[] = Array.from(centroMap.entries())
      .map(([ccId, valor]) => {
        const cc = centrosCusto.find((c) => c.id === ccId);
        const codigo = cc?.codigo || ccId;
        const descricao = cc?.descricao || "";
        return {
          id: ccId,
          codigo,
          descricao,
          valor,
          percentual: total > 0 ? (valor / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    const totalMetaCalc = vendedores.reduce((acc, v) => acc + v.meta, 0);
    const destaque = vendasVendedor[0];
    const qtdContratos = contratos.length;
    const ticketMedioCalc = qtdContratos > 0 ? total / qtdContratos : 0;

    return {
      vendasPorVendedor: vendasVendedor,
      vendasPorCliente: vendasCliente,
      vendasPorCentroCusto: vendasCC,
      totalVendas: total,
      totalMeta: totalMetaCalc,
      vendedorDestaque: destaque,
      ticketMedio: ticketMedioCalc,
      quantidadeContratos: qtdContratos,
    };
  }, [vendedores, contratos, centrosCusto]);

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
            <h1 className="text-2xl font-bold text-foreground">
              {isSalesperson ? "Meu Dashboard Comercial" : "Dashboard Comercial"}
            </h1>
            <p className="text-muted-foreground">
              {isSalesperson ? "Acompanhe seu desempenho de vendas" : "Acompanhe o desempenho da equipe de vendas"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DateRangeFilter
              value={dateRangePreset}
              onChange={handleDateRangeChange}
              customRange={customDateRange}
            />
            {!isSalesperson && (
              <CentroCustoFilterSelect
                value={selectedCentroCusto}
                onValueChange={(v) => setSelectedCentroCusto(v === 'todos' ? '' : v)}
                placeholder="Centro de Custo"
                className="w-[250px]"
              />
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalVendas)}</div>
              <p className="text-xs text-muted-foreground">
                {percentualMeta.toFixed(1)}% da meta geral
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta Geral</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalMeta)}</div>
              <p className="text-xs text-muted-foreground">
                Soma das metas dos vendedores
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">% da Meta</CardTitle>
              <Target className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${percentualMeta >= 100 ? 'text-emerald-600' : percentualMeta >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                {percentualMeta.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {isSalesperson ? "Atingimento da sua meta" : "Atingimento da meta geral"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(ticketMedio)}
              </div>
              <p className="text-xs text-muted-foreground">
                {quantidadeContratos} {quantidadeContratos === 1 ? "venda" : "vendas"} no período
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
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={160}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => label}
                  />
                  <Legend />
                  <Bar dataKey="valor" name="Vendas" fill="#10b981">
                    {isSalesperson && (
                      <LabelList
                        dataKey="valor"
                        position="right"
                        formatter={(v: number) => formatCurrency(v)}
                      />
                    )}
                  </Bar>
                  <Bar dataKey="meta" name="Meta" fill="#3b82f6">
                    {isSalesperson && (
                      <LabelList
                        dataKey="meta"
                        position="right"
                        formatter={(v: number) => formatCurrency(v)}
                      />
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Percentual (gestor: por vendedor | vendedor: por centro de custo) */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isSalesperson ? "Percentual de Vendas por Centro de Custo" : "Percentual de Vendas por Vendedor"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={(isSalesperson ? vendasPorCentroCusto : vendasPorVendedor)
                      .filter((v: any) => (v?.valor || 0) > 0)
                      .map((v: any) => ({
                        ...v,
                        name: isSalesperson ? `${v.codigo}` : v.nome,
                      }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${truncateLabel(name, 14)}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="valor"
                  >
                    {(isSalesperson ? vendasPorCentroCusto : vendasPorVendedor).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              {isSalesperson && vendasPorCentroCusto.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {vendasPorCentroCusto.slice(0, 5).map((cc) => (
                    <div key={cc.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{cc.codigo} - {cc.descricao}</span>
                      <span className="shrink-0">{cc.percentual.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendas por Cliente */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{isSalesperson ? "Meus Top 10 Clientes" : "Top 10 Clientes por Vendas"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendasPorCliente}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="nome"
                    angle={-35}
                    textAnchor="end"
                    height={110}
                    interval={0}
                    tickFormatter={(v) => truncateLabel(v, 14)}
                  />
                  <YAxis width={90} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="valor" name="Vendas" fill="#f59e0b">
                    {isSalesperson && (
                      <LabelList
                        dataKey="valor"
                        position="top"
                        formatter={(v: number) => formatCurrency(v)}
                      />
                    )}
                  </Bar>
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
                      <th className="text-left py-2 px-4">Centro de Custo</th>
                      <th className="text-right py-2 px-4">Vendas</th>
                      <th className="text-right py-2 px-4">Meta</th>
                      <th className="text-right py-2 px-4">% da Meta</th>
                      <th className="text-right py-2 px-4">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasPorVendedor.map((v) => {
                      const percentMeta = v.meta > 0 ? (v.valor / v.meta) * 100 : 0;
                      const hasLinkedCenters = v.centros_vinculados && v.centros_vinculados.length > 0;
                      return (
                        <tr key={v.nome} className="border-b">
                          <td className="py-2 px-4">{v.nome}</td>
                          <td className="py-2 px-4">
                            {hasLinkedCenters ? (
                              <div className="flex flex-wrap gap-1">
                                {v.centros_vinculados!.map((cc) => (
                                  <CompanyTag key={cc.centro_custo_id} codigo={cc.codigo} />
                                ))}
                              </div>
                            ) : v.centro_custo ? (
                              (() => {
                                const legacyCc = centrosCusto.find((c) => c.id === v.centro_custo);
                                return legacyCc?.codigo ? <CompanyTag codigo={legacyCc.codigo} /> : <span className="text-xs text-muted-foreground">-</span>;
                              })()
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
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