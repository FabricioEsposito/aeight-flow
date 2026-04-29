import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DRETrendChartProps {
  title: string;
  description?: string;
  meses: string[]; // formato YYYY-MM
  valores: number[]; // valor por mês (mesmo índice de meses)
  /** 'currency' formata em R$ | 'percent' formata em % */
  format: "currency" | "percent";
  /** cor do valor real (hex/hsl) */
  valueColor?: string;
  /** cor da linha de tendência */
  trendColor?: string;
  /** percentual padrão sugerido para a linha de tendência (ex: 5 = +5% ao mês) */
  defaultGrowthPercent?: number;
}

const monthsAbbr = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const formatMes = (mes: string): string => {
  const [y, m] = mes.split("-");
  return `${monthsAbbr[parseInt(m) - 1]}/${y.slice(2)}`;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const formatPercent = (v: number) => `${v.toFixed(2)}%`;

export function DRETrendChart({
  title,
  description,
  meses,
  valores,
  format,
  valueColor = "hsl(var(--primary))",
  trendColor = "hsl(var(--destructive))",
  defaultGrowthPercent = 5,
}: DRETrendChartProps) {
  const [growthPercent, setGrowthPercent] = useState<number>(defaultGrowthPercent);

  const chartData = useMemo(() => {
    if (!meses.length) return [];
    // Base da tendência = primeiro valor do período
    const base = valores[0] ?? 0;
    const factor = 1 + growthPercent / 100;

    return meses.map((mes, i) => ({
      mes: formatMes(mes),
      valor: valores[i] ?? 0,
      tendencia: base * Math.pow(factor, i),
    }));
  }, [meses, valores, growthPercent]);

  const formatValue = (v: number) =>
    format === "currency" ? formatCurrency(v) : formatPercent(v);

  if (!meses.length) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`growth-${title}`} className="text-sm whitespace-nowrap">
              Tendência (% ao mês):
            </Label>
            <Input
              id={`growth-${title}`}
              type="number"
              step="0.1"
              value={growthPercent}
              onChange={(e) => setGrowthPercent(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) =>
                  format === "currency"
                    ? new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v)
                    : `${v.toFixed(0)}%`
                }
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatValue(value), name]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {format === "currency" ? (
                <Bar dataKey="valor" name="Realizado" fill={valueColor} radius={[4, 4, 0, 0]} />
              ) : (
                <Line
                  type="monotone"
                  dataKey="valor"
                  name="Realizado"
                  stroke={valueColor}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="tendencia"
                name={`Tendência (+${growthPercent}%/mês)`}
                stroke={trendColor}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
