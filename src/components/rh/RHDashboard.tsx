import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, DollarSign, TrendingUp, Building2, Loader2 } from 'lucide-react';
import { CentroCustoFilterSelect } from '@/components/financeiro/CentroCustoFilterSelect';
import { getCompanyTheme } from '@/hooks/useCentroCustoTheme';
import { useSessionState } from '@/hooks/useSessionState';

interface DashboardData {
  folha: Array<{
    fornecedor_id: string;
    fornecedor_razao_social: string;
    mes_referencia: number;
    ano_referencia: number;
    salario_base: number;
    valor_liquido: number;
    tipo_vinculo: string;
    status: string;
    centros_custo: Array<{ codigo: string; descricao: string; percentual: number }>;
  }>;
  beneficios: Array<{
    fornecedor_id: string;
    fornecedor_razao_social: string;
    mes_referencia: number;
    ano_referencia: number;
    valor: number;
    tipo_beneficio: string;
    status: string;
    centros_custo: Array<{ codigo: string; descricao: string; percentual: number }>;
  }>;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CHART_COLORS = ['hsl(var(--primary))', '#FF5722', '#5B2D8B', '#7C6FD0', '#10B981', '#F59E0B'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function RHDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({ folha: [], beneficios: [] });
  const [selectedYear, setSelectedYear] = useSessionState<string>('rh-dashboard', 'year', String(new Date().getFullYear()));
  const [selectedCentroCusto, setSelectedCentroCusto] = useSessionState<string[]>('rh-dashboard', 'centroCusto', []);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const year = parseInt(selectedYear);

      // Fetch folha data
      const { data: folhaRaw } = await supabase
        .from('folha_pagamento')
        .select('fornecedor_id, mes_referencia, ano_referencia, salario_base, valor_liquido, tipo_vinculo, status, contrato_id, fornecedores(razao_social)')
        .eq('ano_referencia', year);

      // Fetch beneficios data
      const { data: beneficiosRaw } = await supabase
        .from('controle_beneficios')
        .select('fornecedor_id, mes_referencia, ano_referencia, valor, tipo_beneficio, status, contrato_id, fornecedores(razao_social)')
        .eq('ano_referencia', year);

      // Fetch cost centers for contracts
      const allContratoIds = [
        ...(folhaRaw || []).map(f => f.contrato_id).filter(Boolean),
        ...(beneficiosRaw || []).map(b => b.contrato_id).filter(Boolean),
      ];
      const uniqueContratoIds = [...new Set(allContratoIds)] as string[];

      let ccMap = new Map<string, Array<{ codigo: string; descricao: string; percentual: number }>>();
      if (uniqueContratoIds.length > 0) {
        const { data: ccData } = await supabase
          .from('contratos_centros_custo')
          .select('contrato_id, percentual, centros_custo:centro_custo_id(codigo, descricao)')
          .in('contrato_id', uniqueContratoIds);

        if (ccData) {
          for (const cc of ccData) {
            const existing = ccMap.get(cc.contrato_id) || [];
            const centroInfo = cc.centros_custo as any;
            if (centroInfo) {
              existing.push({ codigo: centroInfo.codigo, descricao: centroInfo.descricao, percentual: cc.percentual });
            }
            ccMap.set(cc.contrato_id, existing);
          }
        }
      }

      const folha = (folhaRaw || []).map(f => ({
        fornecedor_id: f.fornecedor_id,
        fornecedor_razao_social: (f.fornecedores as any)?.razao_social || '',
        mes_referencia: f.mes_referencia,
        ano_referencia: f.ano_referencia,
        salario_base: f.salario_base,
        valor_liquido: f.valor_liquido,
        tipo_vinculo: f.tipo_vinculo,
        status: f.status,
        centros_custo: f.contrato_id ? (ccMap.get(f.contrato_id) || []) : [],
      }));

      const beneficios = (beneficiosRaw || []).map(b => ({
        fornecedor_id: b.fornecedor_id,
        fornecedor_razao_social: (b.fornecedores as any)?.razao_social || '',
        mes_referencia: b.mes_referencia,
        ano_referencia: b.ano_referencia,
        valor: b.valor,
        tipo_beneficio: b.tipo_beneficio,
        status: b.status,
        centros_custo: b.contrato_id ? (ccMap.get(b.contrato_id) || []) : [],
      }));

      setData({ folha, beneficios });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard RH:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by cost center
  const filteredData = useMemo(() => {
    if (selectedCentroCusto.length === 0) return data;

    const filterByCc = <T extends { centros_custo: Array<{ codigo: string }> }>(items: T[]) =>
      items.filter(item => item.centros_custo.some(cc => selectedCentroCusto.includes(cc.codigo)));

    return {
      folha: filterByCc(data.folha),
      beneficios: filterByCc(data.beneficios),
    };
  }, [data, selectedCentroCusto]);

  // KPIs
  const kpis = useMemo(() => {
    const totalFolha = filteredData.folha.reduce((sum, f) => sum + f.salario_base, 0);
    const totalBeneficios = filteredData.beneficios.reduce((sum, b) => sum + b.valor, 0);
    const totalGeral = totalFolha + totalBeneficios;
    const uniqueFornecedores = new Set([
      ...filteredData.folha.map(f => f.fornecedor_id),
      ...filteredData.beneficios.map(b => b.fornecedor_id),
    ]).size;

    return { totalFolha, totalBeneficios, totalGeral, uniqueFornecedores };
  }, [filteredData]);

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const folhaMes = filteredData.folha.filter(f => f.mes_referencia === mes);
      const beneficiosMes = filteredData.beneficios.filter(b => b.mes_referencia === mes);

      return {
        mes: MONTH_NAMES[i],
        salarios: folhaMes.reduce((sum, f) => sum + f.salario_base, 0),
        beneficios: beneficiosMes.reduce((sum, b) => sum + b.valor, 0),
        total: folhaMes.reduce((sum, f) => sum + f.salario_base, 0) + beneficiosMes.reduce((sum, b) => sum + b.valor, 0),
      };
    });
  }, [filteredData]);

  // Cost center breakdown
  const ccBreakdown = useMemo(() => {
    const map = new Map<string, { codigo: string; descricao: string; salarios: number; beneficios: number }>();

    for (const f of filteredData.folha) {
      for (const cc of f.centros_custo) {
        const key = cc.codigo;
        const existing = map.get(key) || { codigo: cc.codigo, descricao: cc.descricao, salarios: 0, beneficios: 0 };
        existing.salarios += f.salario_base * (cc.percentual / 100);
        map.set(key, existing);
      }
    }

    for (const b of filteredData.beneficios) {
      for (const cc of b.centros_custo) {
        const key = cc.codigo;
        const existing = map.get(key) || { codigo: cc.codigo, descricao: cc.descricao, salarios: 0, beneficios: 0 };
        existing.beneficios += b.valor * (cc.percentual / 100);
        map.set(key, existing);
      }
    }

    return Array.from(map.values()).map(item => ({
      ...item,
      total: item.salarios + item.beneficios,
      color: getCompanyTheme(item.codigo).primaryColor,
    }));
  }, [filteredData]);

  // Pie chart for cost center distribution
  const pieData = useMemo(() => {
    return ccBreakdown.map(cc => ({
      name: getCompanyTheme(cc.codigo).name,
      value: cc.total,
      color: cc.color,
    }));
  }, [ccBreakdown]);

  // Benefit type breakdown
  const benefitTypeData = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of filteredData.beneficios) {
      map.set(b.tipo_beneficio, (map.get(b.tipo_beneficio) || 0) + b.valor);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filteredData]);

  // Vinculo type breakdown
  const vinculoData = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of filteredData.folha) {
      map.set(f.tipo_vinculo, (map.get(f.tipo_vinculo) || 0) + f.salario_base);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filteredData]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

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
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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
                <p className="text-sm text-muted-foreground">Total Folha ({selectedYear})</p>
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
                <p className="text-sm text-muted-foreground">Total Benefícios ({selectedYear})</p>
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
                <p className="text-sm text-muted-foreground">Custo Total RH ({selectedYear})</p>
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
                <p className="text-sm text-muted-foreground">Colaboradores Ativos</p>
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

        {/* Cost center detailed table */}
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

      {/* Bottom row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By vinculo type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Folha por Tipo de Vínculo</CardTitle>
          </CardHeader>
          <CardContent>
            {vinculoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={vinculoData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {vinculoData.map((entry, index) => (
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

        {/* By benefit type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benefícios por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {benefitTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={benefitTypeData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {benefitTypeData.map((entry, index) => (
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