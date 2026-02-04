import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Target, 
  Brain, 
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Loader2,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  BarChart
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import {
  DREValues,
  DRECalculated,
  ValuationConfig,
  DEFAULT_VALUATION_CONFIG,
  calcularDRE,
  aplicarAjustes,
  calcularValuation,
  calcularBreakeven,
  gerarDadosGraficoBreakeven,
  formatarMoeda,
  formatarPercentual,
} from '@/lib/valuation-utils';

interface DRESimulationAnalysisProps {
  dreAtual: DREValues;
  isLoading?: boolean;
}

export function DRESimulationAnalysis({ dreAtual, isLoading = false }: DRESimulationAnalysisProps) {
  // Ajustes percentuais
  const [ajustes, setAjustes] = useState({
    receitaPercent: 0,
    cmvPercent: 0,
    impostosPercent: 0,
    emprestimosPercent: 0,
    despesasFinanceirasPercent: 0,
  });

  // Configuração de valuation
  const [valuationConfig, setValuationConfig] = useState<ValuationConfig>(DEFAULT_VALUATION_CONFIG);

  // Estado da análise IA
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>('');

  // Cálculos do DRE atual
  const dreAtualCalculado = useMemo(() => calcularDRE(dreAtual), [dreAtual]);

  // Valores simulados com ajustes
  const valoresSimulados = useMemo(() => 
    aplicarAjustes(dreAtual, ajustes), 
    [dreAtual, ajustes]
  );

  // Cálculos do DRE simulado
  const dreSimuladoCalculado = useMemo(() => calcularDRE(valoresSimulados), [valoresSimulados]);

  // Breakeven atual e simulado
  const breakevenAtual = useMemo(() => calcularBreakeven(dreAtualCalculado), [dreAtualCalculado]);
  const breakevenSimulado = useMemo(() => calcularBreakeven(dreSimuladoCalculado), [dreSimuladoCalculado]);

  // Valuation do cenário simulado
  const valuation = useMemo(() => 
    calcularValuation(dreSimuladoCalculado.ebitda, valuationConfig),
    [dreSimuladoCalculado.ebitda, valuationConfig]
  );

  // Dados do gráfico de breakeven
  const dadosGraficoBreakeven = useMemo(() => 
    gerarDadosGraficoBreakeven(breakevenSimulado, dreSimuladoCalculado.receita),
    [breakevenSimulado, dreSimuladoCalculado.receita]
  );

  // Dados comparativos para gráfico de barras
  const dadosComparativo = useMemo(() => [
    {
      nome: 'Receita',
      atual: dreAtualCalculado.receita,
      simulado: dreSimuladoCalculado.receita,
    },
    {
      nome: 'EBITDA',
      atual: dreAtualCalculado.ebitda,
      simulado: dreSimuladoCalculado.ebitda,
    },
    {
      nome: 'EBIT',
      atual: dreAtualCalculado.ebit,
      simulado: dreSimuladoCalculado.ebit,
    },
    {
      nome: 'Resultado',
      atual: dreAtualCalculado.resultado,
      simulado: dreSimuladoCalculado.resultado,
    },
  ], [dreAtualCalculado, dreSimuladoCalculado]);

  // Handlers
  const handleAjusteChange = (campo: keyof typeof ajustes, valor: number) => {
    setAjustes(prev => ({ ...prev, [campo]: valor }));
  };

  const handleLimpar = () => {
    setAjustes({
      receitaPercent: 0,
      cmvPercent: 0,
      impostosPercent: 0,
      emprestimosPercent: 0,
      despesasFinanceirasPercent: 0,
    });
    setAiAnalysis('');
    setAnalysisError('');
  };

  const handleGerarAnaliseIA = async () => {
    setIsAnalyzing(true);
    setAnalysisError('');
    setAiAnalysis('');

    try {
      const { data, error } = await supabase.functions.invoke('analyze-dre-simulation', {
        body: {
          dreAtual: dreAtualCalculado,
          dreSimulado: dreSimuladoCalculado,
          ajustes,
          breakevenAtual: {
            pontoEquilibrio: breakevenAtual.pontoEquilibrio,
            existe: breakevenAtual.existe,
          },
          breakevenSimulado: {
            pontoEquilibrio: breakevenSimulado.pontoEquilibrio,
            existe: breakevenSimulado.existe,
          },
          valuation: {
            dcf: valuation.dcf,
            multiploEbitda: valuation.multiploEbitda,
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar análise');
      }

      if (data?.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (err: any) {
      console.error('Erro ao gerar análise:', err);
      setAnalysisError(err.message || 'Erro ao gerar análise com IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Formatação customizada para tooltip
  const formatTooltipValue = (value: number) => formatarMoeda(value);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Simulação DRE & Valuation</h2>
          <p className="text-muted-foreground">
            Simule cenários e analise o impacto no resultado da empresa
          </p>
        </div>
        <Button variant="outline" onClick={handleLimpar}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Painel de Ajustes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Ajustes de Cenário
            </CardTitle>
            <CardDescription>
              Ajuste os percentuais para simular diferentes cenários
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Receita */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Receita</Label>
                <Badge variant={ajustes.receitaPercent >= 0 ? 'default' : 'destructive'}>
                  {ajustes.receitaPercent > 0 ? '+' : ''}{ajustes.receitaPercent}%
                </Badge>
              </div>
              <Slider
                value={[ajustes.receitaPercent]}
                onValueChange={([v]) => handleAjusteChange('receitaPercent', v)}
                min={-50}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Atual: {formatarMoeda(dreAtual.receita)} → Simulado: {formatarMoeda(valoresSimulados.receita)}
              </p>
            </div>

            {/* CMV */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CMV (Custos Variáveis)</Label>
                <Badge variant={ajustes.cmvPercent <= 0 ? 'default' : 'destructive'}>
                  {ajustes.cmvPercent > 0 ? '+' : ''}{ajustes.cmvPercent}%
                </Badge>
              </div>
              <Slider
                value={[ajustes.cmvPercent]}
                onValueChange={([v]) => handleAjusteChange('cmvPercent', v)}
                min={-50}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Atual: {formatarMoeda(dreAtual.cmv)} → Simulado: {formatarMoeda(valoresSimulados.cmv)}
              </p>
            </div>

            {/* Impostos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Impostos</Label>
                <Badge variant={ajustes.impostosPercent <= 0 ? 'default' : 'destructive'}>
                  {ajustes.impostosPercent > 0 ? '+' : ''}{ajustes.impostosPercent}%
                </Badge>
              </div>
              <Slider
                value={[ajustes.impostosPercent]}
                onValueChange={([v]) => handleAjusteChange('impostosPercent', v)}
                min={-50}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Atual: {formatarMoeda(dreAtual.impostos)} → Simulado: {formatarMoeda(valoresSimulados.impostos)}
              </p>
            </div>

            {/* Empréstimos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Empréstimos</Label>
                <Badge variant={ajustes.emprestimosPercent <= 0 ? 'default' : 'destructive'}>
                  {ajustes.emprestimosPercent > 0 ? '+' : ''}{ajustes.emprestimosPercent}%
                </Badge>
              </div>
              <Slider
                value={[ajustes.emprestimosPercent]}
                onValueChange={([v]) => handleAjusteChange('emprestimosPercent', v)}
                min={-50}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Atual: {formatarMoeda(dreAtual.emprestimos)} → Simulado: {formatarMoeda(valoresSimulados.emprestimos)}
              </p>
            </div>

            {/* Despesas Financeiras */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Despesas Financeiras</Label>
                <Badge variant={ajustes.despesasFinanceirasPercent <= 0 ? 'default' : 'destructive'}>
                  {ajustes.despesasFinanceirasPercent > 0 ? '+' : ''}{ajustes.despesasFinanceirasPercent}%
                </Badge>
              </div>
              <Slider
                value={[ajustes.despesasFinanceirasPercent]}
                onValueChange={([v]) => handleAjusteChange('despesasFinanceirasPercent', v)}
                min={-50}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Atual: {formatarMoeda(dreAtual.despesasFinanceiras)} → Simulado: {formatarMoeda(valoresSimulados.despesasFinanceiras)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resultado Simulado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resultado Simulado
            </CardTitle>
            <CardDescription>
              DRE projetado com os ajustes aplicados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ResultRow 
                label="Receita" 
                valorAtual={dreAtualCalculado.receita}
                valorSimulado={dreSimuladoCalculado.receita}
              />
              <ResultRow 
                label="(-) CMV" 
                valorAtual={dreAtualCalculado.cmv}
                valorSimulado={dreSimuladoCalculado.cmv}
                inverso
              />
              <Separator />
              <ResultRow 
                label="Margem de Contribuição" 
                valorAtual={dreAtualCalculado.margemContribuicao}
                valorSimulado={dreSimuladoCalculado.margemContribuicao}
                percentualAtual={dreAtualCalculado.margemContribuicaoPercentual}
                percentualSimulado={dreSimuladoCalculado.margemContribuicaoPercentual}
                destaque
              />
              <ResultRow 
                label="(-) Desp. Administrativas" 
                valorAtual={dreAtualCalculado.despesasAdm}
                valorSimulado={dreSimuladoCalculado.despesasAdm}
                inverso
              />
              <Separator />
              <ResultRow 
                label="EBITDA" 
                valorAtual={dreAtualCalculado.ebitda}
                valorSimulado={dreSimuladoCalculado.ebitda}
                destaque
              />
              <ResultRow 
                label="(-) Impostos" 
                valorAtual={dreAtualCalculado.impostos}
                valorSimulado={dreSimuladoCalculado.impostos}
                inverso
              />
              <ResultRow 
                label="(-) Empréstimos" 
                valorAtual={dreAtualCalculado.emprestimos}
                valorSimulado={dreSimuladoCalculado.emprestimos}
                inverso
              />
              <ResultRow 
                label="(-) Desp. Financeiras" 
                valorAtual={dreAtualCalculado.despesasFinanceiras}
                valorSimulado={dreSimuladoCalculado.despesasFinanceiras}
                inverso
              />
              <Separator />
              <ResultRow 
                label="EBIT" 
                valorAtual={dreAtualCalculado.ebit}
                valorSimulado={dreSimuladoCalculado.ebit}
                destaque
              />
              <ResultRow 
                label="(-) Provisão CSLL/IRRF (34%)" 
                valorAtual={dreAtualCalculado.provisaoCsllIrrf}
                valorSimulado={dreSimuladoCalculado.provisaoCsllIrrf}
                inverso
              />
              <Separator className="border-2" />
              <ResultRow 
                label="Resultado do Exercício" 
                valorAtual={dreAtualCalculado.resultado}
                valorSimulado={dreSimuladoCalculado.resultado}
                destaque
                grande
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ponto de Equilíbrio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ponto de Equilíbrio Financeiro
          </CardTitle>
          <CardDescription>
            Análise do breakeven - receita mínima para cobrir custos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cards de Breakeven */}
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Ponto de Equilíbrio Atual</p>
                <p className="text-2xl font-bold">
                  {breakevenAtual.existe 
                    ? formatarMoeda(breakevenAtual.pontoEquilibrio) 
                    : 'N/A'}
                </p>
                {!breakevenAtual.existe && (
                  <p className="text-xs text-destructive">Margem de contribuição negativa</p>
                )}
              </div>
              <div className="rounded-lg border p-4 bg-primary/5">
                <p className="text-sm text-muted-foreground">Ponto de Equilíbrio Simulado</p>
                <p className="text-2xl font-bold text-primary">
                  {breakevenSimulado.existe 
                    ? formatarMoeda(breakevenSimulado.pontoEquilibrio) 
                    : 'N/A'}
                </p>
                {breakevenSimulado.existe && breakevenAtual.existe && (
                  <p className={`text-xs ${breakevenSimulado.pontoEquilibrio < breakevenAtual.pontoEquilibrio ? 'text-green-600' : 'text-red-600'}`}>
                    {breakevenSimulado.pontoEquilibrio < breakevenAtual.pontoEquilibrio ? '↓' : '↑'} 
                    {' '}
                    {formatarPercentual(Math.abs((breakevenSimulado.pontoEquilibrio - breakevenAtual.pontoEquilibrio) / breakevenAtual.pontoEquilibrio * 100))}
                  </p>
                )}
                {!breakevenSimulado.existe && (
                  <p className="text-xs text-destructive">Margem de contribuição negativa</p>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Margem de Segurança</p>
                {breakevenSimulado.existe && dreSimuladoCalculado.receita > breakevenSimulado.pontoEquilibrio ? (
                  <>
                    <p className="text-2xl font-bold text-green-600">
                      {formatarMoeda(dreSimuladoCalculado.receita - breakevenSimulado.pontoEquilibrio)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarPercentual((dreSimuladoCalculado.receita - breakevenSimulado.pontoEquilibrio) / dreSimuladoCalculado.receita * 100)} acima do breakeven
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-red-600">
                      {breakevenSimulado.existe 
                        ? formatarMoeda(dreSimuladoCalculado.receita - breakevenSimulado.pontoEquilibrio)
                        : 'N/A'}
                    </p>
                    {breakevenSimulado.existe && (
                      <p className="text-xs text-destructive">Abaixo do breakeven</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Gráfico de Breakeven */}
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={dadosGraficoBreakeven}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="percentual" 
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: '% da Receita Atual', position: 'bottom', offset: 0 }}
                  />
                  <YAxis 
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatarMoeda(value), name]}
                    labelFormatter={(label) => `${label}% da Receita`}
                  />
                  <Legend />
                  
                  {/* Área de lucro (verde) */}
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    fill="hsl(142, 76%, 36%)"
                    fillOpacity={0.1}
                    stroke="none"
                    name="Área de Lucro"
                  />
                  
                  {/* Linha de Receita */}
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="hsl(217, 91%, 60%)" 
                    strokeWidth={2}
                    name="Receita"
                    dot={false}
                  />
                  
                  {/* Linha de Custo Total */}
                  <Line 
                    type="monotone" 
                    dataKey="custoTotal" 
                    stroke="hsl(0, 84%, 60%)" 
                    strokeWidth={2}
                    name="Custo Total"
                    dot={false}
                  />
                  
                  {/* Linha de referência do breakeven */}
                  {breakevenSimulado.existe && (
                    <ReferenceLine 
                      x={(breakevenSimulado.pontoEquilibrio / dreSimuladoCalculado.receita) * 100}
                      stroke="hsl(142, 76%, 36%)"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{ 
                        value: 'Breakeven', 
                        position: 'top',
                        fill: 'hsl(142, 76%, 36%)',
                        fontSize: 12
                      }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Valuation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valuation
            </CardTitle>
            <CardDescription>
              Estimativa de valor da empresa com base no EBITDA simulado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configurações */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa de Desconto (WACC)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={valuationConfig.taxaDesconto * 100}
                    onChange={(e) => setValuationConfig(prev => ({ 
                      ...prev, 
                      taxaDesconto: parseFloat(e.target.value) / 100 || 0.15 
                    }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taxa de Crescimento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={valuationConfig.taxaCrescimento * 100}
                    onChange={(e) => setValuationConfig(prev => ({ 
                      ...prev, 
                      taxaCrescimento: parseFloat(e.target.value) / 100 || 0.05 
                    }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Múltiplo EBITDA</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={valuationConfig.multiploEbitda}
                    onChange={(e) => setValuationConfig(prev => ({ 
                      ...prev, 
                      multiploEbitda: parseFloat(e.target.value) || 6 
                    }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">x</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Período de Projeção</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={valuationConfig.periodoProjecao}
                    onChange={(e) => setValuationConfig(prev => ({ 
                      ...prev, 
                      periodoProjecao: parseInt(e.target.value) || 5 
                    }))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">anos</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Resultados */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm text-muted-foreground">DCF (Fluxo de Caixa Descontado)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatarMoeda(valuation.dcf)}
                </p>
              </div>
              <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                <p className="text-sm text-muted-foreground">Múltiplo EBITDA ({valuationConfig.multiploEbitda}x)</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatarMoeda(valuation.multiploEbitda)}
                </p>
              </div>
            </div>

            {/* EBITDA Base */}
            <div className="text-center text-sm text-muted-foreground">
              Base: EBITDA Simulado de {formatarMoeda(dreSimuladoCalculado.ebitda)}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Comparativo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparativo Atual vs Simulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dadosComparativo} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="nome" width={80} />
                <Tooltip formatter={(value: number) => formatarMoeda(value)} />
                <Legend />
                <Bar dataKey="atual" fill="hsl(var(--muted-foreground))" name="Atual" />
                <Bar dataKey="simulado" fill="hsl(var(--primary))" name="Simulado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Análise com IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análise e Recomendações (IA)
          </CardTitle>
          <CardDescription>
            Insights estratégicos gerados por inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGerarAnaliseIA} 
            disabled={isAnalyzing}
            className="w-full sm:w-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando análise...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Gerar Análise com IA
              </>
            )}
          </Button>

          {analysisError && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="font-medium">Erro ao gerar análise</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{analysisError}</p>
            </div>
          )}

          {aiAnalysis && (
            <div className="rounded-lg border bg-muted/30 p-6 space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {aiAnalysis.split('\n').map((line, index) => {
                  // Parse markdown-style headers
                  if (line.startsWith('**') && line.endsWith('**')) {
                    const title = line.replace(/\*\*/g, '');
                    let icon = <Lightbulb className="h-4 w-4" />;
                    if (title.includes('OBSERVAÇÕES')) icon = <CheckCircle className="h-4 w-4 text-blue-500" />;
                    if (title.includes('RISCOS')) icon = <AlertTriangle className="h-4 w-4 text-yellow-500" />;
                    if (title.includes('OPORTUNIDADES')) icon = <TrendingUp className="h-4 w-4 text-green-500" />;
                    if (title.includes('RECOMENDAÇÕES')) icon = <Target className="h-4 w-4 text-purple-500" />;
                    
                    return (
                      <div key={index} className="flex items-center gap-2 font-bold mt-4 first:mt-0">
                        {icon}
                        {title}
                      </div>
                    );
                  }
                  if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
                    return <p key={index} className="ml-6 my-1">{line}</p>;
                  }
                  if (line.trim()) {
                    return <p key={index} className="my-1">{line}</p>;
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {!aiAnalysis && !isAnalyzing && !analysisError && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Clique no botão acima para gerar uma análise detalhada do cenário simulado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente auxiliar para linhas do resultado
interface ResultRowProps {
  label: string;
  valorAtual: number;
  valorSimulado: number;
  percentualAtual?: number;
  percentualSimulado?: number;
  inverso?: boolean;
  destaque?: boolean;
  grande?: boolean;
}

function ResultRow({ 
  label, 
  valorAtual, 
  valorSimulado, 
  percentualAtual,
  percentualSimulado,
  inverso = false, 
  destaque = false,
  grande = false
}: ResultRowProps) {
  const variacao = valorAtual !== 0 
    ? ((valorSimulado - valorAtual) / Math.abs(valorAtual)) * 100 
    : 0;
  
  const isPositivo = inverso ? variacao < 0 : variacao > 0;
  const isNegativo = inverso ? variacao > 0 : variacao < 0;

  return (
    <div className={`flex items-center justify-between ${destaque ? 'font-semibold' : ''} ${grande ? 'text-lg' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground text-sm w-28 text-right">
          {formatarMoeda(valorAtual)}
          {percentualAtual !== undefined && (
            <span className="text-xs ml-1">({formatarPercentual(percentualAtual)})</span>
          )}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={`w-32 text-right ${
          isPositivo ? 'text-green-600' : isNegativo ? 'text-red-600' : ''
        }`}>
          {formatarMoeda(valorSimulado)}
          {percentualSimulado !== undefined && (
            <span className="text-xs ml-1">({formatarPercentual(percentualSimulado)})</span>
          )}
        </span>
        <Badge 
          variant={isPositivo ? 'default' : isNegativo ? 'destructive' : 'secondary'}
          className="w-16 justify-center"
        >
          {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}
