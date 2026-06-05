import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calculator, Download, FileSpreadsheet, FileText, Info, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDias = (v: number) => `${v.toFixed(1)} dias`;

interface NCGProps {
  dateRange: { from: string; to: string } | null;
  centroCusto?: string[];
}

interface DREValuesNCG {
  receita: number;
  cmv: number;
  despesasAdm: number;
  contasReceber: number;
  fornecedores: number;
  diasPeriodo: number;
  pmrReal: number; // calculated from data_vencimento → data_recebimento
  pmpReal: number; // calculated from data_vencimento → data_pagamento
}

const PAGE_SIZE = 1000;

async function fetchAll(table: 'contas_receber' | 'contas_pagar', select: string, build: (q: any) => any) {
  let all: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const q = build(supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1));
    const { data, error } = await q;
    if (error) throw error;
    if (data && data.length > 0) {
      all = [...all, ...data];
      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }
  return all;
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return (db - da) / 86400000;
}

// Média aritmética com remoção de outliers (trimmed mean a 10%) para evitar distorções
function trimmedMean(values: number[], trimPct = 0.1): number {
  if (values.length === 0) return 0;
  if (values.length < 5) {
    return values.reduce((s, v) => s + v, 0) / values.length;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * trimPct);
  const trimmed = sorted.slice(cut, sorted.length - cut);
  return trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
}

export function NCGAnalysis({ dateRange, centroCusto }: NCGProps) {
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<DREValuesNCG>({
    receita: 0,
    cmv: 0,
    despesasAdm: 0,
    contasReceber: 0,
    fornecedores: 0,
    diasPeriodo: 30,
    pmrReal: 0,
    pmpReal: 0,
  });
  const [autoMode, setAutoMode] = useState(true);

  const update = <K extends keyof DREValuesNCG>(key: K, val: DREValuesNCG[K]) => {
    setAutoMode(false);
    setValues((s) => ({ ...s, [key]: val }));
  };

  const carregarDoDRE = async () => {
    if (!dateRange) return;
    try {
      setLoading(true);

      // diasPeriodo a partir do range
      const dias = Math.max(1, Math.round(diffDays(dateRange.from, dateRange.to)) + 1);

      // Plano de contas para mapear códigos
      const { data: planos } = await supabase
        .from('plano_contas')
        .select('id, codigo')
        .eq('status', 'ativo');
      const planosMap = new Map((planos || []).map((p: any) => [p.id, p.codigo as string]));
      const startsWith = (id: string | null, prefix: string) => {
        const c = id ? planosMap.get(id) : null;
        return !!c && (c === prefix || c.startsWith(prefix + '.'));
      };

      // Excluir Aplicações 5.1.4
      const isExcluded = (id: string | null) => {
        const c = id ? planosMap.get(id) : null;
        return !!c && (c === '5.1.4' || c.startsWith('5.1.4.'));
      };

      // Buscar rateios para filtro de centro custo (se necessário)
      const ccFilterActive = !!(centroCusto && centroCusto.length > 0);
      const ccSet = new Set(centroCusto || []);

      const passesCcReceber = async (lancs: any[]) => {
        if (!ccFilterActive) return lancs;
        const ids = lancs.map(l => l.id);
        const { data: rateios } = await supabase
          .from('lancamentos_centros_custo')
          .select('conta_receber_id, centro_custo_id, percentual')
          .in('conta_receber_id', ids);
        const map = new Map<string, any[]>();
        (rateios || []).forEach((r: any) => {
          const arr = map.get(r.conta_receber_id) || [];
          arr.push(r);
          map.set(r.conta_receber_id, arr);
        });
        return lancs
          .map(l => {
            const r = map.get(l.id);
            if (!r || r.length === 0) return null;
            const pct = r.filter((x: any) => ccSet.has(x.centro_custo_id))
              .reduce((s: number, x: any) => s + Number(x.percentual || 0), 0);
            if (pct <= 0) return null;
            return { ...l, valor: Number(l.valor) * (pct / 100) };
          })
          .filter(Boolean) as any[];
      };

      const passesCcPagar = async (lancs: any[]) => {
        if (!ccFilterActive) return lancs;
        const ids = lancs.map(l => l.id);
        const { data: rateios } = await supabase
          .from('lancamentos_centros_custo')
          .select('conta_pagar_id, centro_custo_id, percentual')
          .in('conta_pagar_id', ids);
        const map = new Map<string, any[]>();
        (rateios || []).forEach((r: any) => {
          const arr = map.get(r.conta_pagar_id) || [];
          arr.push(r);
          map.set(r.conta_pagar_id, arr);
        });
        return lancs
          .map(l => {
            const r = map.get(l.id);
            if (!r || r.length === 0) return null;
            const pct = r.filter((x: any) => ccSet.has(x.centro_custo_id))
              .reduce((s: number, x: any) => s + Number(x.percentual || 0), 0);
            if (pct <= 0) return null;
            return { ...l, valor: Number(l.valor) * (pct / 100) };
          })
          .filter(Boolean) as any[];
      };

      // Receitas no período (competência)
      const receitasRaw = await fetchAll('contas_receber', 'id, valor, plano_conta_id, data_competencia, data_vencimento, data_recebimento, status', q =>
        q.neq('status', 'cancelado')
         .gte('data_competencia', dateRange.from)
         .lte('data_competencia', dateRange.to));
      const receitas = (await passesCcReceber(receitasRaw.filter((r: any) => !isExcluded(r.plano_conta_id))));

      // Despesas no período (competência)
      const despesasRaw = await fetchAll('contas_pagar', 'id, valor, plano_conta_id, data_competencia, data_vencimento, data_pagamento, status', q =>
        q.neq('status', 'cancelado')
         .gte('data_competencia', dateRange.from)
         .lte('data_competencia', dateRange.to));
      const despesas = (await passesCcPagar(despesasRaw.filter((r: any) => !isExcluded(r.plano_conta_id))));

      // Sumarizar Receita (1.1), CMV (2.1), Despesas Adm (3.1)
      let receita = 0, cmv = 0, despesasAdm = 0;
      receitas.forEach((r: any) => {
        if (startsWith(r.plano_conta_id, '1.1')) receita += Number(r.valor) || 0;
      });
      despesas.forEach((r: any) => {
        if (startsWith(r.plano_conta_id, '2.1')) cmv += Number(r.valor) || 0;
        else if (startsWith(r.plano_conta_id, '3.1')) despesasAdm += Number(r.valor) || 0;
      });

      // Saldos pendentes (snapshot até data fim do período)
      const pendentesReceberRaw = await fetchAll('contas_receber', 'id, valor, plano_conta_id, data_vencimento, status', q =>
        q.eq('status', 'pendente')
         .lte('data_vencimento', dateRange.to));
      const pendentesReceber = (await passesCcReceber(pendentesReceberRaw.filter((r: any) => !isExcluded(r.plano_conta_id))));
      const contasReceberSaldo = pendentesReceber.reduce((s, r: any) => s + (Number(r.valor) || 0), 0);

      const pendentesPagarRaw = await fetchAll('contas_pagar', 'id, valor, plano_conta_id, data_vencimento, status', q =>
        q.eq('status', 'pendente')
         .lte('data_vencimento', dateRange.to));
      const pendentesPagar = (await passesCcPagar(pendentesPagarRaw.filter((r: any) => !isExcluded(r.plano_conta_id))));
      const fornecedoresSaldo = pendentesPagar.reduce((s, r: any) => s + (Number(r.valor) || 0), 0);

      // PMR real: média (10% trimmed) de (data_recebimento - data_competencia) nas contas recebidas no período
      const recebidasRaw = await fetchAll('contas_receber', 'id, valor, plano_conta_id, data_competencia, data_recebimento, status', q =>
        q.eq('status', 'pago')
         .not('data_recebimento', 'is', null)
         .gte('data_recebimento', dateRange.from)
         .lte('data_recebimento', dateRange.to));
      const recebidas = (await passesCcReceber(recebidasRaw.filter((r: any) =>
        !isExcluded(r.plano_conta_id) && r.data_competencia && r.data_recebimento)));
      const pmrDias = recebidas
        .map((r: any) => diffDays(r.data_competencia, r.data_recebimento))
        .filter((d: number) => Number.isFinite(d));
      const pmrReal = trimmedMean(pmrDias);

      // PMP real: média (10% trimmed) de (data_pagamento - data_competencia)
      const pagasRaw = await fetchAll('contas_pagar', 'id, valor, plano_conta_id, data_competencia, data_pagamento, status', q =>
        q.eq('status', 'pago')
         .not('data_pagamento', 'is', null)
         .gte('data_pagamento', dateRange.from)
         .lte('data_pagamento', dateRange.to));
      const pagas = (await passesCcPagar(pagasRaw.filter((r: any) =>
        !isExcluded(r.plano_conta_id) && r.data_competencia && r.data_pagamento)));
      const pmpDias = pagas
        .map((r: any) => diffDays(r.data_competencia, r.data_pagamento))
        .filter((d: number) => Number.isFinite(d));
      const pmpReal = trimmedMean(pmpDias);

      setValues(v => ({
        ...v,
        diasPeriodo: dias,
        receita,
        cmv,
        despesasAdm,
        contasReceber: contasReceberSaldo,
        fornecedores: fornecedoresSaldo,
        pmrReal,
        pmpReal,
        // estoque permanece manual (empresa de serviços)
      }));
      setAutoMode(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDoDRE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.from, dateRange?.to, JSON.stringify(centroCusto)]);

  const calc = useMemo(() => {
    const dias = values.diasPeriodo > 0 ? values.diasPeriodo : 30;
    // PMR e PMP: usar valores reais (vencimento → recebimento/pagamento)
    const pmr = values.pmrReal;
    const pmp = values.pmpReal;
    // Ciclo financeiro sem PME (empresa de serviços sem estoque)
    const cicloFinanceiro = pmr - pmp;
    const custoOpMensal = values.cmv + values.despesasAdm;
    const custoOpDiario = custoOpMensal / dias;
    const ncg = custoOpDiario * cicloFinanceiro;

    return { pmr, pmp, cicloFinanceiro, custoOpMensal, custoOpDiario, ncg };
  }, [values]);

  const cicloData = [
    { nome: "PMR", dias: calc.pmr, fill: "hsl(217 91% 60%)" },
    { nome: "PMP", dias: -calc.pmp, fill: "hsl(0 84% 60%)" },
    { nome: "Ciclo", dias: calc.cicloFinanceiro, fill: "hsl(262 83% 58%)" },
  ];

  const composicaoData = [
    { nome: "CMV", valor: values.cmv },
    { nome: "Despesas Adm.", valor: values.despesasAdm },
  ].filter((d) => d.valor > 0);

  const comparativoData = [
    { nome: "Receita", valor: values.receita, fill: "hsl(142 71% 45%)" },
    { nome: "Custo Operacional", valor: calc.custoOpMensal, fill: "hsl(38 92% 50%)" },
    { nome: "NCG", valor: calc.ncg, fill: "hsl(217 91% 60%)" },
  ];

  const PIE_COLORS = ["hsl(217 91% 60%)", "hsl(38 92% 50%)"];

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Necessidade de Capital de Giro (NCG)"],
      [`Período: ${dateRange?.from} a ${dateRange?.to}`],
      [],
      ["Entradas", "Valor"],
      ["Receita (DRE)", values.receita],
      ["CMV (DRE)", values.cmv],
      ["Despesas Administrativas (DRE)", values.despesasAdm],
      ["Contas a Receber (pendentes)", values.contasReceber],
      ["Fornecedores (pendentes)", values.fornecedores],
      ["Dias do Período", values.diasPeriodo],
      [],
      ["Indicadores", "Resultado"],
      ["PMR real (competência → recebimento)", calc.pmr],
      ["PMP real (competência → pagamento)", calc.pmp],
      ["Ciclo Financeiro (dias)", calc.cicloFinanceiro],
      ["Custo Operacional Mensal", calc.custoOpMensal],
      ["Custo Operacional Diário", calc.custoOpDiario],
      ["NCG", calc.ncg],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "NCG");
    XLSX.writeFile(wb, `NCG_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Necessidade de Capital de Giro (NCG)", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${dateRange?.from} a ${dateRange?.to}`, 14, 25);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [["Entradas (do DRE)", "Valor"]],
      body: [
        ["Receita", formatCurrency(values.receita)],
        ["CMV", formatCurrency(values.cmv)],
        ["Despesas Administrativas", formatCurrency(values.despesasAdm)],
        ["Contas a Receber (pendentes)", formatCurrency(values.contasReceber)],
        ["Fornecedores (pendentes)", formatCurrency(values.fornecedores)],
        ["Dias do Período", String(values.diasPeriodo)],
      ],
    });

    autoTable(doc, {
      head: [["Indicador", "Resultado"]],
      body: [
        ["PMR (real)", formatDias(calc.pmr)],
        ["PMP (real)", formatDias(calc.pmp)],
        ["Ciclo Financeiro", formatDias(calc.cicloFinanceiro)],
        ["Custo Operacional Mensal", formatCurrency(calc.custoOpMensal)],
        ["Custo Operacional Diário", formatCurrency(calc.custoOpDiario)],
        ["NCG", formatCurrency(calc.ncg)],
      ],
    });

    autoTable(doc, {
      head: [["Memória de Cálculo"]],
      body: [
        [`PMR = média (10% trimmed) de (data_recebimento − data_competência) = ${calc.pmr.toFixed(2)} dias`],
        [`PMP = média (10% trimmed) de (data_pagamento − data_competência) = ${calc.pmp.toFixed(2)} dias`],
        [`Ciclo Financeiro = PMR − PMP = ${calc.cicloFinanceiro.toFixed(2)} dias`],
        [`Custo Op. Diário = (CMV + Desp. Adm.) / Dias = ${formatCurrency(calc.custoOpDiario)}`],
        [`NCG = Custo Op. Diário × Ciclo Financeiro = ${formatCurrency(calc.ncg)}`],
      ],
    });

    doc.save(`NCG_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading && autoMode) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Necessidade de Capital de Giro
          </h2>
          <p className="text-sm text-muted-foreground">
            Valores carregados do DRE. PMR e PMP calculados a partir das datas reais de vencimento, recebimento e pagamento.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregarDoDRE} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar do DRE
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DRE (carregado automaticamente)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Receita (R$)</Label>
              <CurrencyInput value={values.receita} onChange={(v) => update("receita", v)} />
            </div>
            <div>
              <Label>CMV - Custo Variável (R$)</Label>
              <CurrencyInput value={values.cmv} onChange={(v) => update("cmv", v)} />
            </div>
            <div>
              <Label>Despesas Administrativas (R$)</Label>
              <CurrencyInput value={values.despesasAdm} onChange={(v) => update("despesasAdm", v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capital de Giro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Contas a Receber pendentes (R$)</Label>
              <CurrencyInput value={values.contasReceber} onChange={(v) => update("contasReceber", v)} />
            </div>
            <div>
              <Label>Estoque (R$) - manual</Label>
              <CurrencyInput value={values.estoque} onChange={(v) => update("estoque", v)} />
            </div>
            <div>
              <Label>Fornecedores pendentes (R$)</Label>
              <CurrencyInput value={values.fornecedores} onChange={(v) => update("fornecedores", v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Dias do Período</Label>
              <Input
                type="number"
                min={1}
                value={values.diasPeriodo}
                onChange={(e) => update("diasPeriodo", Number(e.target.value) || 0)}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Os valores são preenchidos automaticamente com base no período selecionado no filtro do dashboard. PMR e PMP são calculados a partir dos lançamentos efetivamente recebidos e pagos.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <IndicatorCard label="PMR (real)" value={formatDias(calc.pmr)} color="text-blue-600" />
        <IndicatorCard label="PME" value={formatDias(calc.pme)} color="text-emerald-600" />
        <IndicatorCard label="PMP (real)" value={formatDias(calc.pmp)} color="text-red-600" />
        <IndicatorCard label="Ciclo Financeiro" value={formatDias(calc.cicloFinanceiro)} color="text-purple-600" />
        <IndicatorCard label="Custo Op. Diário" value={formatCurrency(calc.custoOpDiario)} color="text-amber-600" />
        <IndicatorCard label="NCG" value={formatCurrency(calc.ncg)} color="text-primary" highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ciclo Financeiro (dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cicloData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)} dias`} />
                <Bar dataKey="dias">
                  {cicloData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição do Custo Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={composicaoData}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: any) => `${e.nome}: ${formatCurrency(e.valor)}`}
                >
                  {composicaoData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Comparativo: Receita × Custo Operacional × NCG</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparativoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor">
                  {comparativoData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Memória de Cálculo & Fórmulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Fórmulas</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>PMR = média aritmética (com 10% de outliers removidos) das diferenças data_recebimento − data_competência</li>
                <li>PME = (Estoque / CMV) × Dias</li>
                <li>PMP = média aritmética (com 10% de outliers removidos) das diferenças data_pagamento − data_competência</li>
                <li>Ciclo Financeiro = PMR + PME − PMP</li>
                <li>Custo Op. Diário = (CMV + Desp. Adm.) / Dias</li>
                <li className="font-semibold text-foreground">NCG = Custo Op. Diário × Ciclo Financeiro</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Resultado com os valores do período</h4>
              <ul className="space-y-1 text-muted-foreground font-mono text-xs">
                <li>PMR = <strong>{calc.pmr.toFixed(2)} dias</strong></li>
                <li>PME = <strong>{calc.pme.toFixed(2)} dias</strong></li>
                <li>PMP = <strong>{calc.pmp.toFixed(2)} dias</strong></li>
                <li>Ciclo = {calc.pmr.toFixed(2)} + {calc.pme.toFixed(2)} − {calc.pmp.toFixed(2)} = <strong>{calc.cicloFinanceiro.toFixed(2)} dias</strong></li>
                <li>Custo Diário = ({formatCurrency(values.cmv)} + {formatCurrency(values.despesasAdm)}) / {values.diasPeriodo} = <strong>{formatCurrency(calc.custoOpDiario)}</strong></li>
                <li className="text-foreground">NCG = {formatCurrency(calc.custoOpDiario)} × {calc.cicloFinanceiro.toFixed(2)} = <strong>{formatCurrency(calc.ncg)}</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IndicatorCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary border-2" : ""}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
