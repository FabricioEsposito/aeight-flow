import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, DollarSign, TrendingUp, Building2, Loader2 } from 'lucide-react';
import { CentroCustoFilterSelect } from '@/components/financeiro/CentroCustoFilterSelect';
import { DateRangeFilter, DateRangePreset } from '@/components/financeiro/DateRangeFilter';
import { getCompanyTheme } from '@/hooks/useCentroCustoTheme';
import { useSessionState } from '@/hooks/useSessionState';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, endOfYear, subDays, subMonths, format,
  startOfDay, endOfDay, getMonth, getYear, parseISO
} from 'date-fns';

interface ParcelaRecord {
  parcela_id: string;
  contrato_id: string;
  fornecedor_id: string;
  data_vencimento: string;
  valor: number;
  tipo: 'folha' | 'beneficio';
  plano_contas_descricao: string;
  centros_custo: Array<{ id: string; codigo: string; descricao: string; percentual: number }>;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CHART_COLORS = ['hsl(var(--primary))', '#FF5722', '#5B2D8B', '#7C6FD0', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getDateRange(preset: DateRangePreset, customRange?: { from?: Date; to?: Date }): { from: Date; to: Date } | null {
  const now = new Date();
  switch (preset) {
    case 'hoje': return { from: startOfDay(now), to: endOfDay(now) };
    case 'esta-semana': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'este-mes': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'este-ano': return { from: startOfYear(now), to: endOfYear(now) };
    case 'ultimos-30-dias': return { from: subDays(now, 30), to: now };
    case 'ultimos-12-meses': return { from: subMonths(now, 12), to: now };
    case 'periodo-personalizado':
      if (customRange?.from && customRange?.to) return { from: customRange.from, to: customRange.to };
      return null;
    case 'todo-periodo': return null;
    default: return null;
  }
}

export function RHDashboard() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ParcelaRecord[]>([]);
  const [selectedCentroCusto, setSelectedCentroCusto] = useSessionState<string[]>('rh-dashboard', 'centroCusto', []);
  const [datePreset, setDatePreset] = useSessionState<DateRangePreset>('rh-dashboard', 'datePreset', 'periodo-personalizado');
  const defaultFrom = `${new Date().getFullYear()}-01-01T00:00:00.000Z`;
  const defaultTo = endOfMonth(new Date()).toISOString();
  const [customDateRange, setCustomDateRange] = useSessionState<{ from?: string; to?: string }>('rh-dashboard', 'customRange', { from: defaultFrom, to: defaultTo });

  const dateRange = useMemo(() => {
    return getDateRange(datePreset, {
      from: customDateRange.from ? new Date(customDateRange.from) : undefined,
      to: customDateRange.to ? new Date(customDateRange.to) : undefined,
    });
  }, [datePreset, customDateRange]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all contracts that are folha or beneficio
      const { data: contratos } = await supabase
        .from('contratos')
        .select('id, is_folha_funcionario, is_beneficio_funcionario, fornecedor_id, plano_contas_id, plano_contas:plano_contas_id(descricao)')
        .or('is_folha_funcionario.eq.true,is_beneficio_funcionario.eq.true');

      if (!contratos || contratos.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const contratoMap = new Map(contratos.map(c => [c.id, c]));
      const contratoIds = contratos.map(c => c.id);

      // Fetch parcelas for these contracts
      let query = supabase
        .from('parcelas_contrato')
        .select('id, contrato_id, data_vencimento, valor')
        .in('contrato_id', contratoIds);

      if (dateRange) {
        query = query
          .gte('data_vencimento', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('data_vencimento', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data: parcelas } = await query;

      // Fetch cost centers for all contracts
      const { data: ccData } = await supabase
        .from('contratos_centros_custo')
        .select('contrato_id, centro_custo_id, percentual, centros_custo:centro_custo_id(id, codigo, descricao)')
        .in('contrato_id', contratoIds);

      const ccMap = new Map<string, Array<{ id: string; codigo: string; descricao: string; percentual: number }>>();
      if (ccData) {
        for (const cc of ccData) {
          const existing = ccMap.get(cc.contrato_id) || [];
          const info = cc.centros_custo as any;
          if (info) {
            existing.push({ id: info.id, codigo: info.codigo, descricao: info.descricao, percentual: cc.percentual });
          }
          ccMap.set(cc.contrato_id, existing);
        }
      }

      const result: ParcelaRecord[] = (parcelas || []).map(p => {
        const contrato = contratoMap.get(p.contrato_id!);
        const isFolha = contrato?.is_folha_funcionario;
        return {
          parcela_id: p.id,
          contrato_id: p.contrato_id!,
          fornecedor_id: contrato?.fornecedor_id || '',
          data_vencimento: p.data_vencimento,
          valor: p.valor,
          tipo: isFolha ? 'folha' : 'beneficio',
          plano_contas_descricao: (contrato?.plano_contas as any)?.descricao || '',
          centros_custo: ccMap.get(p.contrato_id!) || [],
        };
      });

      setRecords(result);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard RH:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by cost center - also trim the centros_custo array to only selected ones
  const filteredRecords = useMemo(() => {
    if (selectedCentroCusto.length === 0) return records;
    return records
      .filter(r => r.centros_custo.some(cc => selectedCentroCusto.includes(cc.id)))
      .map(r => ({
        ...r,
        centros_custo: r.centros_custo.filter(cc => selectedCentroCusto.includes(cc.id)),
      }));
  }, [records, selectedCentroCusto]);

  // KPIs
  const kpis = useMemo(() => {
    const totalFolha = filteredRecords.filter(r => r.tipo === 'folha').reduce((sum, r) => sum + r.valor, 0);
    const totalBeneficios = filteredRecords.filter(r => r.tipo === 'beneficio').reduce((sum, r) => sum + r.valor, 0);
    const totalGeral = totalFolha + totalBeneficios;
    const uniqueFornecedores = new Set(filteredRecords.map(r => r.fornecedor_id)).size;

    return { totalFolha, totalBeneficios, totalGeral, uniqueFornecedores };
  }, [filteredRecords]);

  // Monthly chart data - group by month from data_vencimento
  const monthlyChartData = useMemo(() => {
    const monthMap = new Map<string, { salarios: number; beneficios: number }>();

    for (const r of filteredRecords) {
      const date = parseISO(r.data_vencimento);
      const key = `${getYear(date)}-${String(getMonth(date) + 1).padStart(2, '0')}`;

      const existing = monthMap.get(key) || { salarios: 0, beneficios: 0 };
      if (r.tipo === 'folha') {
        existing.salarios += r.valor;
      } else {
        existing.beneficios += r.valor;
      }
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, vals]) => {
        const [year, month] = key.split('-');
        return {
          mes: `${MONTH_NAMES[parseInt(month) - 1]}/${year.slice(2)}`,
          salarios: vals.salarios,
          beneficios: vals.beneficios,
          total: vals.salarios + vals.beneficios,
        };
      });
  }, [filteredRecords]);

  // Cost center breakdown - proportional
  const ccBreakdown = useMemo(() => {
    const map = new Map<string, { codigo: string; descricao: string; salarios: number; beneficios: number }>();

    for (const r of filteredRecords) {
      if (r.centros_custo.length === 0) continue;
      for (const cc of r.centros_custo) {
        const key = cc.codigo;
        const existing = map.get(key) || { codigo: cc.codigo, descricao: cc.descricao, salarios: 0, beneficios: 0 };
        const proporcional = r.valor * (cc.percentual / 100);
        if (r.tipo === 'folha') {
          existing.salarios += proporcional;
        } else {
          existing.beneficios += proporcional;
        }
        map.set(key, existing);
      }
    }

    return Array.from(map.values()).map(item => ({
      ...item,
      total: item.salarios + item.beneficios,
      color: getCompanyTheme(item.codigo).primaryColor,
    }));
  }, [filteredRecords]);

  // Pie chart for cost center distribution
  const pieData = useMemo(() => {
    return ccBreakdown.map(cc => ({
      name: getCompanyTheme(cc.codigo).name,
      value: cc.total,
      color: cc.color,
    }));
  }, [ccBreakdown]);

  // Plano de contas breakdown (replaces tipo_vinculo / tipo_beneficio)
  const categoriaData = useMemo(() => {
    const map = new Map<string, { folha: number; beneficio: number }>();
    for (const r of filteredRecords) {
      const key = r.plano_contas_descricao || 'Sem categoria';
      const existing = map.get(key) || { folha: 0, beneficio: 0 };
      if (r.tipo === 'folha') existing.folha += r.valor;
      else existing.beneficio += r.valor;
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([name, vals], i) => ({
      name,
      value: vals.folha + vals.beneficio,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filteredRecords]);

  // Monthly evolution per cost center for stacked bar
  const monthlyCcChartData = useMemo(() => {
    const monthMap = new Map<string, Map<string, number>>();
    const allCcCodes = new Set<string>();

    for (const r of filteredRecords) {
      const date = parseISO(r.data_vencimento);
      const monthKey = `${getYear(date)}-${String(getMonth(date) + 1).padStart(2, '0')}`;

      for (const cc of r.centros_custo) {
        allCcCodes.add(cc.codigo);
        const monthData = monthMap.get(monthKey) || new Map<string, number>();
        monthData.set(cc.codigo, (monthData.get(cc.codigo) || 0) + r.valor * (cc.percentual / 100));
        monthMap.set(monthKey, monthData);
      }
    }

    return {
      data: Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, ccVals]) => {
          const [year, month] = key.split('-');
          const entry: Record<string, any> = { mes: `${MONTH_NAMES[parseInt(month) - 1]}/${year.slice(2)}` };
          for (const code of allCcCodes) {
            entry[code] = ccVals.get(code) || 0;
          }
          return entry;
        }),
      ccCodes: Array.from(allCcCodes),
    };
  }, [filteredRecords]);

  const handleDateChange = (preset: DateRangePreset, range?: { from?: Date; to?: Date }) => {
    setDatePreset(preset);
    if (preset === 'periodo-personalizado' && range?.from && range?.to) {
      setCustomDateRange({ from: range.from.toISOString(), to: range.to.toISOString() });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter
          value={datePreset}
          onChange={handleDateChange}
          customRange={customDateRange.from && customDateRange.to ? {
            from: new Date(customDateRange.from),
            to: new Date(customDateRange.to),
          } : undefined}
        />

        <CentroCustoFilterSelect
          value={selectedCentroCusto}
          onValueChange={setSelectedCentroCusto}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Folha</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(kpis.totalFolha)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FF572215' }}>
                <TrendingUp className="h-5 w-5" style={{ color: '#FF5722' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Benefícios</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(kpis.totalBeneficios)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#5B2D8B15' }}>
                <Building2 className="h-5 w-5" style={{ color: '#5B2D8B' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total RH</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(kpis.totalGeral)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#7C6FD015' }}>
                <Users className="h-5 w-5" style={{ color: '#7C6FD0' }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Colaboradores</p>
                <p className="text-xl font-bold text-foreground">{kpis.uniqueFornecedores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Mensal - Salários vs Benefícios</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={90} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="salarios" name="Salários" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="beneficios" name="Benefícios" fill="#FF5722" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">Nenhum dado disponível no período</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly by Cost Center - Stacked */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Mensal por Centro de Custo</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyCcChartData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyCcChartData.data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={90} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                {monthlyCcChartData.ccCodes.map(code => (
                  <Bar
                    key={code}
                    dataKey={code}
                    name={getCompanyTheme(code).name}
                    fill={getCompanyTheme(code).primaryColor}
                    stackId="cc"
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">Nenhum dado disponível no período</p>
          )}
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Center Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-wrap gap-2 mt-2">
                  {ccBreakdown.map(cc => (
                    <Badge key={cc.codigo} variant="outline" className="text-xs" style={{ borderColor: cc.color, color: cc.color }}>
                      {getCompanyTheme(cc.codigo).name}: {formatCurrency(cc.total)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Cost center detailed breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            {ccBreakdown.length > 0 ? (
              <div className="space-y-3">
                {ccBreakdown.map(cc => {
                  const theme = getCompanyTheme(cc.codigo);
                  return (
                    <div key={cc.codigo} className="p-3 rounded-lg border" style={{ borderLeftWidth: 3, borderLeftColor: theme.primaryColor }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm" style={{ color: theme.primaryColor }}>{theme.name}</span>
                        <span className="font-bold text-sm text-foreground">{formatCurrency(cc.total)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Salários: <span className="font-medium text-foreground">{formatCurrency(cc.salarios)}</span></div>
                        <div>Benefícios: <span className="font-medium text-foreground">{formatCurrency(cc.beneficios)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoriaData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoriaData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}