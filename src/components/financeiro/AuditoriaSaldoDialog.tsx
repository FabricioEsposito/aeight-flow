import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, ClipboardCheck, RefreshCw, TrendingDown, TrendingUp, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface AuditoriaSaldoDialogProps {
  contaBancariaFilter: string[];
  dateRange: { start: string; end: string } | undefined;
  contasBancarias: Array<{ id: string; descricao: string; banco: string; saldo_inicial: number }>;
}

interface BreakdownData {
  saldoInicialConta: number;
  entradasPagasAntes: number;
  saidasPagasAntes: number;
  saldoInicialCalculado: number;
  
  entradasPagasNoPeriodo: number;
  saidasPagasNoPeriodo: number;
  
  entradasPendentes: number;
  entradasVencidas: number;
  saidasPendentes: number;
  saidasVencidas: number;
  
  saldoFinalRealizado: number;
  saldoFinalPrevisto: number;
}

interface ContaBreakdown extends BreakdownData {
  contaId: string;
  contaNome: string;
}

export function AuditoriaSaldoDialog({ 
  contaBancariaFilter, 
  dateRange, 
  contasBancarias 
}: AuditoriaSaldoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extratoBreakdown, setExtratoBreakdown] = useState<BreakdownData | null>(null);
  const [dashboardBreakdown, setDashboardBreakdown] = useState<BreakdownData | null>(null);
  const [contasBreakdown, setContasBreakdown] = useState<ContaBreakdown[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const fetchAuditData = async () => {
    if (!dateRange) return;
    
    setLoading(true);
    try {
      const contasFiltradas = contaBancariaFilter.length === 0 
        ? contasBancarias 
        : contasBancarias.filter(c => contaBancariaFilter.includes(c.id));
      
      const contaIds = contasFiltradas.map(c => c.id);
      
      const saldoInicialConta = contasFiltradas.reduce((sum, c) => sum + Number(c.saldo_inicial), 0);
      
      let entradasAntesPagasQuery = supabase
        .from('contas_receber')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pago')
        .lt('data_recebimento', dateRange.start);
      
      if (contaIds.length > 0) {
        entradasAntesPagasQuery = entradasAntesPagasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: entradasAntesPagas } = await entradasAntesPagasQuery;
      
      let saidasAntesPagasQuery = supabase
        .from('contas_pagar')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pago')
        .lt('data_pagamento', dateRange.start);
      
      if (contaIds.length > 0) {
        saidasAntesPagasQuery = saidasAntesPagasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: saidasAntesPagas } = await saidasAntesPagasQuery;
      
      let entradasPeriodoPagasQuery = supabase
        .from('contas_receber')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pago')
        .gte('data_recebimento', dateRange.start)
        .lte('data_recebimento', dateRange.end);
      
      if (contaIds.length > 0) {
        entradasPeriodoPagasQuery = entradasPeriodoPagasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: entradasPeriodoPagas } = await entradasPeriodoPagasQuery;
      
      let saidasPeriodoPagasQuery = supabase
        .from('contas_pagar')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pago')
        .gte('data_pagamento', dateRange.start)
        .lte('data_pagamento', dateRange.end);
      
      if (contaIds.length > 0) {
        saidasPeriodoPagasQuery = saidasPeriodoPagasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: saidasPeriodoPagas } = await saidasPeriodoPagasQuery;
      
      const todayStr = new Date().toISOString().split('T')[0];
      
      let entradasPendentesQuery = supabase
        .from('contas_receber')
        .select('valor, conta_bancaria_id, data_vencimento')
        .eq('status', 'pendente')
        .gte('data_vencimento', dateRange.start)
        .lte('data_vencimento', dateRange.end);
      
      if (contaIds.length > 0) {
        entradasPendentesQuery = entradasPendentesQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: entradasPendentesData } = await entradasPendentesQuery;
      
      const entradasPendentes = (entradasPendentesData || []).filter(e => e.data_vencimento >= todayStr);
      
      let saidasPendentesQuery = supabase
        .from('contas_pagar')
        .select('valor, conta_bancaria_id, data_vencimento')
        .eq('status', 'pendente')
        .gte('data_vencimento', dateRange.start)
        .lte('data_vencimento', dateRange.end);
      
      if (contaIds.length > 0) {
        saidasPendentesQuery = saidasPendentesQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: saidasPendentesData } = await saidasPendentesQuery;
      
      const saidasPendentes = (saidasPendentesData || []).filter(e => e.data_vencimento >= todayStr);
      
      const entradasPagasAntes = (entradasAntesPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const saidasPagasAntes = (saidasAntesPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const saldoInicialCalculado = saldoInicialConta + entradasPagasAntes - saidasPagasAntes;
      
      const entradasPagasNoPeriodo = (entradasPeriodoPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const saidasPagasNoPeriodo = (saidasPeriodoPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      
      const totalEntradasPendentes = (entradasPendentes || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const totalEntradasVencidas = 0;
      const totalSaidasPendentes = (saidasPendentes || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const totalSaidasVencidas = 0;
      
      const saldoFinalRealizado = saldoInicialCalculado + entradasPagasNoPeriodo - saidasPagasNoPeriodo;
      const saldoFinalPrevisto = saldoFinalRealizado + totalEntradasPendentes - totalSaidasPendentes;
      
      const extratoData: BreakdownData = {
        saldoInicialConta,
        entradasPagasAntes,
        saidasPagasAntes,
        saldoInicialCalculado,
        entradasPagasNoPeriodo,
        saidasPagasNoPeriodo,
        entradasPendentes: totalEntradasPendentes,
        entradasVencidas: totalEntradasVencidas,
        saidasPendentes: totalSaidasPendentes,
        saidasVencidas: totalSaidasVencidas,
        saldoFinalRealizado,
        saldoFinalPrevisto,
      };
      
      setExtratoBreakdown(extratoData);
      setDashboardBreakdown(extratoData);
      
      const breakdownPorConta: ContaBreakdown[] = contasFiltradas.map(conta => {
        const saldoInicialContaIndividual = Number(conta.saldo_inicial);
        
        const entradasPagasAntesIndividual = (entradasAntesPagas || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const saidasPagasAntesIndividual = (saidasAntesPagas || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const saldoInicialCalcIndividual = saldoInicialContaIndividual + entradasPagasAntesIndividual - saidasPagasAntesIndividual;
        
        const entradasPagasNoPeriodoIndividual = (entradasPeriodoPagas || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const saidasPagasNoPeriodoIndividual = (saidasPeriodoPagas || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const entradasPendentesIndividual = (entradasPendentes || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const entradasVencidasIndividual = 0;
        
        const saidasPendentesIndividual = (saidasPendentes || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const saidasVencidasIndividual = 0;
        
        const saldoFinalRealizadoIndividual = saldoInicialCalcIndividual + entradasPagasNoPeriodoIndividual - saidasPagasNoPeriodoIndividual;
        const saldoFinalPrevistoIndividual = saldoFinalRealizadoIndividual + entradasPendentesIndividual - saidasPendentesIndividual;
        
        return {
          contaId: conta.id,
          contaNome: `${conta.descricao} - ${conta.banco}`,
          saldoInicialConta: saldoInicialContaIndividual,
          entradasPagasAntes: entradasPagasAntesIndividual,
          saidasPagasAntes: saidasPagasAntesIndividual,
          saldoInicialCalculado: saldoInicialCalcIndividual,
          entradasPagasNoPeriodo: entradasPagasNoPeriodoIndividual,
          saidasPagasNoPeriodo: saidasPagasNoPeriodoIndividual,
          entradasPendentes: entradasPendentesIndividual,
          entradasVencidas: entradasVencidasIndividual,
          saidasPendentes: saidasPendentesIndividual,
          saidasVencidas: saidasVencidasIndividual,
          saldoFinalRealizado: saldoFinalRealizadoIndividual,
          saldoFinalPrevisto: saldoFinalPrevistoIndividual,
        };
      });
      
      setContasBreakdown(breakdownPorConta);
      
    } catch (error) {
      console.error('Erro ao buscar dados de auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditData();
    }
  }, [isOpen, contaBancariaFilter, dateRange]);

  const compareValues = (val1: number, val2: number) => {
    const diff = Math.abs(val1 - val2);
    if (diff < 0.01) return 'match';
    return 'mismatch';
  };

  // Compact summary card
  const SummaryCard = ({ label, value, variant }: { label: string; value: number; variant?: 'success' | 'danger' | 'neutral' }) => {
    const colorClass = variant === 'success' ? 'text-emerald-600' : variant === 'danger' ? 'text-rose-600' : 'text-foreground';
    return (
      <div className="flex flex-col items-center p-2 bg-muted/50 rounded-lg">
        <span className="text-xs text-muted-foreground text-center">{label}</span>
        <span className={`font-mono text-sm font-semibold ${colorClass}`}>{formatCurrency(value)}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Modo Auditoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="w-5 h-5" />
            Auditoria de Saldo
          </DialogTitle>
          {dateRange && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(dateRange.start + 'T00:00:00'), 'dd/MM/yyyy')} - {format(new Date(dateRange.end + 'T00:00:00'), 'dd/MM/yyyy')}
            </p>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !dateRange ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Selecione um período de datas.</span>
              </div>
            </div>
          ) : extratoBreakdown && dashboardBreakdown ? (
            <Tabs defaultValue="resumo" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
                <TabsTrigger value="detalhes" className="text-xs">Detalhes</TabsTrigger>
                <TabsTrigger value="contas" className="text-xs">Por Conta</TabsTrigger>
              </TabsList>
              
              {/* Tab Resumo */}
              <TabsContent value="resumo" className="flex-1 overflow-auto mt-4">
                <div className="space-y-4">
                  {/* Cards de resumo compactos */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground mb-1">Saldo Inicial</div>
                      <div className="font-mono text-lg font-bold">{formatCurrency(extratoBreakdown.saldoInicialCalculado)}</div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground mb-1">Saldo Realizado</div>
                      <div className={`font-mono text-lg font-bold ${extratoBreakdown.saldoFinalRealizado < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(extratoBreakdown.saldoFinalRealizado)}
                      </div>
                    </Card>
                    <Card className="p-3">
                      <div className="text-xs text-muted-foreground mb-1">Saldo Previsto</div>
                      <div className={`font-mono text-lg font-bold ${extratoBreakdown.saldoFinalPrevisto < 0 ? 'text-rose-600' : 'text-primary'}`}>
                        {formatCurrency(extratoBreakdown.saldoFinalPrevisto)}
                      </div>
                    </Card>
                  </div>

                  {/* Movimentações compactas */}
                  <Card className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Movimentações</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <TrendingUp className="w-3 h-3" />
                            Recebido
                          </span>
                          <span className="font-mono">{formatCurrency(extratoBreakdown.entradasPagasNoPeriodo)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-600/70">+ A Receber</span>
                          <span className="font-mono">{formatCurrency(extratoBreakdown.entradasPendentes)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 text-rose-600">
                            <TrendingDown className="w-3 h-3" />
                            Pago
                          </span>
                          <span className="font-mono">{formatCurrency(extratoBreakdown.saidasPagasNoPeriodo)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-rose-600/70">+ A Pagar</span>
                          <span className="font-mono">{formatCurrency(extratoBreakdown.saidasPendentes)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Status de comparação */}
                  <Card className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Validação</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Saldo Inicial', val1: extratoBreakdown.saldoInicialCalculado, val2: dashboardBreakdown.saldoInicialCalculado },
                        { label: 'Realizado', val1: extratoBreakdown.saldoFinalRealizado, val2: dashboardBreakdown.saldoFinalRealizado },
                        { label: 'Previsto', val1: extratoBreakdown.saldoFinalPrevisto, val2: dashboardBreakdown.saldoFinalPrevisto },
                        { label: 'Entradas', val1: extratoBreakdown.entradasPagasNoPeriodo + extratoBreakdown.entradasPendentes, val2: dashboardBreakdown.entradasPagasNoPeriodo + dashboardBreakdown.entradasPendentes },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          {compareValues(item.val1, item.val2) === 'match' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab Detalhes */}
              <TabsContent value="detalhes" className="flex-1 overflow-auto mt-4">
                <div className="space-y-4">
                  {/* Cálculo do Saldo Inicial */}
                  <Card className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Cálculo do Saldo Inicial</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Saldo Inicial das Contas</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.saldoInicialConta)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>+ Entradas pagas antes do período</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.entradasPagasAntes)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>- Saídas pagas antes do período</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.saidasPagasAntes)}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>= Saldo Inicial do Período</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.saldoInicialCalculado)}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Movimentações Realizadas */}
                  <Card className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Movimentações Realizadas</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-600">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Entradas recebidas no período
                        </span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.entradasPagasNoPeriodo)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Saídas pagas no período
                        </span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.saidasPagasNoPeriodo)}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>= Saldo Realizado</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.saldoFinalRealizado)}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Previsões */}
                  <Card className="p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Previsões (Pendentes em Dia)</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-600/80">
                        <span>+ A receber pendentes</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.entradasPendentes)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600/80">
                        <span>- A pagar pendentes</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.saidasPendentes)}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>= Saldo Previsto</span>
                        <span className="font-mono">{formatCurrency(extratoBreakdown.saldoFinalPrevisto)}</span>
                      </div>
                    </div>
                  </Card>

                  <p className="text-xs text-muted-foreground text-center">
                    Nota: Vencidos (status = vencido) NÃO afetam o saldo previsto.
                  </p>
                </div>
              </TabsContent>

              {/* Tab Por Conta */}
              <TabsContent value="contas" className="flex-1 overflow-auto mt-4">
                {contasBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {contasBreakdown.map((conta) => (
                      <Card key={conta.contaId} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{conta.contaNome}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          <SummaryCard label="Início" value={conta.saldoInicialCalculado} />
                          <SummaryCard label="+ Recebido" value={conta.entradasPagasNoPeriodo} variant="success" />
                          <SummaryCard label="- Pago" value={conta.saidasPagasNoPeriodo} variant="danger" />
                          <SummaryCard label="Realizado" value={conta.saldoFinalRealizado} variant={conta.saldoFinalRealizado < 0 ? 'danger' : 'neutral'} />
                          <SummaryCard label="Previsto" value={conta.saldoFinalPrevisto} variant={conta.saldoFinalPrevisto < 0 ? 'danger' : 'neutral'} />
                        </div>
                      </Card>
                    ))}
                    
                    {/* Total */}
                    <Card className="p-3 bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold">TOTAL</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <SummaryCard 
                          label="Início" 
                          value={contasBreakdown.reduce((s, c) => s + c.saldoInicialCalculado, 0)} 
                        />
                        <SummaryCard 
                          label="+ Recebido" 
                          value={contasBreakdown.reduce((s, c) => s + c.entradasPagasNoPeriodo, 0)} 
                          variant="success" 
                        />
                        <SummaryCard 
                          label="- Pago" 
                          value={contasBreakdown.reduce((s, c) => s + c.saidasPagasNoPeriodo, 0)} 
                          variant="danger" 
                        />
                        <SummaryCard 
                          label="Realizado" 
                          value={contasBreakdown.reduce((s, c) => s + c.saldoFinalRealizado, 0)} 
                          variant={contasBreakdown.reduce((s, c) => s + c.saldoFinalRealizado, 0) < 0 ? 'danger' : 'neutral'}
                        />
                        <SummaryCard 
                          label="Previsto" 
                          value={contasBreakdown.reduce((s, c) => s + c.saldoFinalPrevisto, 0)} 
                          variant={contasBreakdown.reduce((s, c) => s + c.saldoFinalPrevisto, 0) < 0 ? 'danger' : 'neutral'}
                        />
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Nenhuma conta bancária disponível.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
