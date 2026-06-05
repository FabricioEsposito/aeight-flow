import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencyInput, formatBrazilianCurrency } from "@/components/ui/currency-input";
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
import { Calculator, Download, FileSpreadsheet, FileText, Info } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDias = (v: number) => `${v.toFixed(1)} dias`;

interface NCGState {
  receita: number;
  cmv: number;
  despesasAdm: number;
  contasReceber: number;
  estoque: number;
  fornecedores: number;
  diasPeriodo: number;
}

const INITIAL: NCGState = {
  receita: 0,
  cmv: 0,
  despesasAdm: 0,
  contasReceber: 0,
  estoque: 0,
  fornecedores: 0,
  diasPeriodo: 30,
};

export function NCGAnalysis() {
  const [values, setValues] = useState<NCGState>(INITIAL);

  const update = <K extends keyof NCGState>(key: K, val: NCGState[K]) =>
    setValues((s) => ({ ...s, [key]: val }));

  const calc = useMemo(() => {
    const dias = values.diasPeriodo > 0 ? values.diasPeriodo : 30;
    const pmr = values.receita > 0 ? (values.contasReceber / values.receita) * dias : 0;
    const pme = values.cmv > 0 ? (values.estoque / values.cmv) * dias : 0;
    const pmp = values.cmv > 0 ? (values.fornecedores / values.cmv) * dias : 0;
    const cicloFinanceiro = pmr + pme - pmp;
    const custoOpMensal = values.cmv + values.despesasAdm;
    const custoOpDiario = custoOpMensal / dias;
    const ncg = custoOpDiario * cicloFinanceiro;

    return { pmr, pme, pmp, cicloFinanceiro, custoOpMensal, custoOpDiario, ncg };
  }, [values]);

  const cicloData = [
    { nome: "PMR", dias: calc.pmr, fill: "hsl(217 91% 60%)" },
    { nome: "PME", dias: calc.pme, fill: "hsl(142 71% 45%)" },
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
      [],
      ["Entradas", "Valor"],
      ["Receita", values.receita],
      ["CMV (Custo Variável)", values.cmv],
      ["Despesas Administrativas", values.despesasAdm],
      ["Contas a Receber", values.contasReceber],
      ["Estoque", values.estoque],
      ["Fornecedores", values.fornecedores],
      ["Dias do Período", values.diasPeriodo],
      [],
      ["Indicadores", "Resultado"],
      ["PMR (dias)", calc.pmr],
      ["PME (dias)", calc.pme],
      ["PMP (dias)", calc.pmp],
      ["Ciclo Financeiro (dias)", calc.cicloFinanceiro],
      ["Custo Operacional Mensal", calc.custoOpMensal],
      ["Custo Operacional Diário", calc.custoOpDiario],
      ["NCG", calc.ncg],
      [],
      ["Memória de Cálculo"],
      [`PMR = (${values.contasReceber} / ${values.receita}) × ${values.diasPeriodo} = ${calc.pmr.toFixed(2)}`],
      [`PME = (${values.estoque} / ${values.cmv}) × ${values.diasPeriodo} = ${calc.pme.toFixed(2)}`],
      [`PMP = (${values.fornecedores} / ${values.cmv}) × ${values.diasPeriodo} = ${calc.pmp.toFixed(2)}`],
      [`Ciclo Financeiro = ${calc.pmr.toFixed(2)} + ${calc.pme.toFixed(2)} - ${calc.pmp.toFixed(2)} = ${calc.cicloFinanceiro.toFixed(2)}`],
      [`Custo Op. Diário = (${values.cmv} + ${values.despesasAdm}) / ${values.diasPeriodo} = ${calc.custoOpDiario.toFixed(2)}`],
      [`NCG = ${calc.custoOpDiario.toFixed(2)} × ${calc.cicloFinanceiro.toFixed(2)} = ${calc.ncg.toFixed(2)}`],
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
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [["Entradas", "Valor"]],
      body: [
        ["Receita", formatCurrency(values.receita)],
        ["CMV (Custo Variável)", formatCurrency(values.cmv)],
        ["Despesas Administrativas", formatCurrency(values.despesasAdm)],
        ["Contas a Receber", formatCurrency(values.contasReceber)],
        ["Estoque", formatCurrency(values.estoque)],
        ["Fornecedores", formatCurrency(values.fornecedores)],
        ["Dias do Período", String(values.diasPeriodo)],
      ],
    });

    autoTable(doc, {
      head: [["Indicador", "Resultado"]],
      body: [
        ["PMR", formatDias(calc.pmr)],
        ["PME", formatDias(calc.pme)],
        ["PMP", formatDias(calc.pmp)],
        ["Ciclo Financeiro", formatDias(calc.cicloFinanceiro)],
        ["Custo Operacional Mensal", formatCurrency(calc.custoOpMensal)],
        ["Custo Operacional Diário", formatCurrency(calc.custoOpDiario)],
        ["NCG", formatCurrency(calc.ncg)],
      ],
    });

    autoTable(doc, {
      head: [["Memória de Cálculo"]],
      body: [
        [`PMR = (Contas a Receber / Receita) × Dias = (${formatCurrency(values.contasReceber)} / ${formatCurrency(values.receita)}) × ${values.diasPeriodo} = ${calc.pmr.toFixed(2)} dias`],
        [`PME = (Estoque / CMV) × Dias = (${formatCurrency(values.estoque)} / ${formatCurrency(values.cmv)}) × ${values.diasPeriodo} = ${calc.pme.toFixed(2)} dias`],
        [`PMP = (Fornecedores / CMV) × Dias = (${formatCurrency(values.fornecedores)} / ${formatCurrency(values.cmv)}) × ${values.diasPeriodo} = ${calc.pmp.toFixed(2)} dias`],
        [`Ciclo Financeiro = PMR + PME - PMP = ${calc.cicloFinanceiro.toFixed(2)} dias`],
        [`Custo Op. Diário = (CMV + Desp. Adm.) / Dias = ${formatCurrency(calc.custoOpDiario)}`],
        [`NCG = Custo Op. Diário × Ciclo Financeiro = ${formatCurrency(calc.ncg)}`],
      ],
    });

    doc.save(`NCG_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Necessidade de Capital de Giro
          </h2>
          <p className="text-sm text-muted-foreground">
            Cálculo automático com base no ciclo financeiro da empresa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DRE</CardTitle>
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
              <Label>Saldo de Clientes / Contas a Receber (R$)</Label>
              <CurrencyInput value={values.contasReceber} onChange={(v) => update("contasReceber", v)} />
            </div>
            <div>
              <Label>Saldo de Estoque (R$)</Label>
              <CurrencyInput value={values.estoque} onChange={(v) => update("estoque", v)} />
            </div>
            <div>
              <Label>Saldo de Fornecedores (R$)</Label>
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
                Padrão de 30 dias para análise mensal. Ajuste para 90 (trimestral) ou 365 (anual).
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicator cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <IndicatorCard label="PMR" value={formatDias(calc.pmr)} color="text-blue-600" />
        <IndicatorCard label="PME" value={formatDias(calc.pme)} color="text-emerald-600" />
        <IndicatorCard label="PMP" value={formatDias(calc.pmp)} color="text-red-600" />
        <IndicatorCard label="Ciclo Financeiro" value={formatDias(calc.cicloFinanceiro)} color="text-purple-600" />
        <IndicatorCard label="Custo Op. Diário" value={formatCurrency(calc.custoOpDiario)} color="text-amber-600" />
        <IndicatorCard label="NCG" value={formatCurrency(calc.ncg)} color="text-primary" highlight />
      </div>

      {/* Charts */}
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

      {/* Memória de cálculo + fórmulas */}
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
                <li>PMR = (Contas a Receber / Receita) × Dias</li>
                <li>PME = (Estoque / CMV) × Dias</li>
                <li>PMP = (Fornecedores / CMV) × Dias</li>
                <li>Ciclo Financeiro = PMR + PME − PMP</li>
                <li>Custo Op. Diário = (CMV + Desp. Adm.) / Dias</li>
                <li className="font-semibold text-foreground">NCG = Custo Op. Diário × Ciclo Financeiro</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Cálculo com os valores informados</h4>
              <ul className="space-y-1 text-muted-foreground font-mono text-xs">
                <li>
                  PMR = ({formatBrazilianCurrency(values.contasReceber) || 0} / {formatBrazilianCurrency(values.receita) || 0}) × {values.diasPeriodo} = <strong>{calc.pmr.toFixed(2)} dias</strong>
                </li>
                <li>
                  PME = ({formatBrazilianCurrency(values.estoque) || 0} / {formatBrazilianCurrency(values.cmv) || 0}) × {values.diasPeriodo} = <strong>{calc.pme.toFixed(2)} dias</strong>
                </li>
                <li>
                  PMP = ({formatBrazilianCurrency(values.fornecedores) || 0} / {formatBrazilianCurrency(values.cmv) || 0}) × {values.diasPeriodo} = <strong>{calc.pmp.toFixed(2)} dias</strong>
                </li>
                <li>
                  Ciclo = {calc.pmr.toFixed(2)} + {calc.pme.toFixed(2)} − {calc.pmp.toFixed(2)} = <strong>{calc.cicloFinanceiro.toFixed(2)} dias</strong>
                </li>
                <li>
                  Custo Diário = ({formatBrazilianCurrency(values.cmv) || 0} + {formatBrazilianCurrency(values.despesasAdm) || 0}) / {values.diasPeriodo} = <strong>{formatCurrency(calc.custoOpDiario)}</strong>
                </li>
                <li className="text-foreground">
                  NCG = {formatCurrency(calc.custoOpDiario)} × {calc.cicloFinanceiro.toFixed(2)} = <strong>{formatCurrency(calc.ncg)}</strong>
                </li>
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
