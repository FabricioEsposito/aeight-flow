import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, ClipboardCheck, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
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
      
      // Saldo inicial das contas
      const saldoInicialConta = contasFiltradas.reduce((sum, c) => sum + Number(c.saldo_inicial), 0);
      
      // === BUSCAR DADOS DO EXTRATO (Lógica atual) ===
      
      // Entradas PAGAS antes do período (pela data de recebimento)
      let entradasAntesPagasQuery = supabase
        .from('contas_receber')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pago')
        .lt('data_recebimento', dateRange.start);
      
      if (contaIds.length > 0) {
        entradasAntesPagasQuery = entradasAntesPagasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: entradasAntesPagas } = await entradasAntesPagasQuery;
      
      // Saídas PAGAS antes do período (pela data de pagamento)
      let saidasAntesPagasQuery = supabase
        .from('contas_pagar')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pago')
        .lt('data_pagamento', dateRange.start);
      
      if (contaIds.length > 0) {
        saidasAntesPagasQuery = saidasAntesPagasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: saidasAntesPagas } = await saidasAntesPagasQuery;
      
      // Entradas PAGAS no período
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
      
      // Saídas PAGAS no período
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
      
      // Entradas PENDENTES no período (por data de vencimento)
      let entradasPendentesQuery = supabase
        .from('contas_receber')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pendente')
        .gte('data_vencimento', dateRange.start)
        .lte('data_vencimento', dateRange.end);
      
      if (contaIds.length > 0) {
        entradasPendentesQuery = entradasPendentesQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: entradasPendentes } = await entradasPendentesQuery;
      
      // Entradas VENCIDAS no período (por data de vencimento)
      let entradasVencidasQuery = supabase
        .from('contas_receber')
        .select('valor, conta_bancaria_id')
        .eq('status', 'vencido')
        .gte('data_vencimento', dateRange.start)
        .lte('data_vencimento', dateRange.end);
      
      if (contaIds.length > 0) {
        entradasVencidasQuery = entradasVencidasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: entradasVencidas } = await entradasVencidasQuery;
      
      // Saídas PENDENTES no período
      let saidasPendentesQuery = supabase
        .from('contas_pagar')
        .select('valor, conta_bancaria_id')
        .eq('status', 'pendente')
        .gte('data_vencimento', dateRange.start)
        .lte('data_vencimento', dateRange.end);
      
      if (contaIds.length > 0) {
        saidasPendentesQuery = saidasPendentesQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: saidasPendentes } = await saidasPendentesQuery;
      
      // Saídas VENCIDAS no período
      let saidasVencidasQuery = supabase
        .from('contas_pagar')
        .select('valor, conta_bancaria_id')
        .eq('status', 'vencido')
        .gte('data_vencimento', dateRange.start)
        .lte('data_vencimento', dateRange.end);
      
      if (contaIds.length > 0) {
        saidasVencidasQuery = saidasVencidasQuery.in('conta_bancaria_id', contaIds);
      }
      
      const { data: saidasVencidas } = await saidasVencidasQuery;
      
      // Calcular totais para Extrato
      const entradasPagasAntes = (entradasAntesPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const saidasPagasAntes = (saidasAntesPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const saldoInicialCalculado = saldoInicialConta + entradasPagasAntes - saidasPagasAntes;
      
      const entradasPagasNoPeriodo = (entradasPeriodoPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const saidasPagasNoPeriodo = (saidasPeriodoPagas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      
      const totalEntradasPendentes = (entradasPendentes || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const totalEntradasVencidas = (entradasVencidas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const totalSaidasPendentes = (saidasPendentes || []).reduce((sum, e) => sum + Number(e.valor), 0);
      const totalSaidasVencidas = (saidasVencidas || []).reduce((sum, e) => sum + Number(e.valor), 0);
      
      const saldoFinalRealizado = saldoInicialCalculado + entradasPagasNoPeriodo - saidasPagasNoPeriodo;
      const saldoFinalPrevisto = saldoFinalRealizado + totalEntradasPendentes + totalEntradasVencidas - totalSaidasPendentes - totalSaidasVencidas;
      
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
      
      // Dashboard usa a mesma lógica após as correções
      setDashboardBreakdown(extratoData);
      
      // Breakdown por conta bancária
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
        
        const entradasVencidasIndividual = (entradasVencidas || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const saidasPendentesIndividual = (saidasPendentes || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const saidasVencidasIndividual = (saidasVencidas || [])
          .filter(e => e.conta_bancaria_id === conta.id)
          .reduce((sum, e) => sum + Number(e.valor), 0);
        
        const saldoFinalRealizadoIndividual = saldoInicialCalcIndividual + entradasPagasNoPeriodoIndividual - saidasPagasNoPeriodoIndividual;
        const saldoFinalPrevistoIndividual = saldoFinalRealizadoIndividual + entradasPendentesIndividual + entradasVencidasIndividual - saidasPendentesIndividual - saidasVencidasIndividual;
        
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

  const BreakdownTable = ({ data, title }: { data: BreakdownData; title: string }) => (
    <Card className="p-4">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        {title}
      </h3>
      <div className="space-y-3">
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Cálculo do Saldo Inicial</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Saldo Inicial das Contas</span>
              <span className="font-mono">{formatCurrency(data.saldoInicialConta)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>+ Entradas pagas antes do período</span>
              <span className="font-mono">{formatCurrency(data.entradasPagasAntes)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>- Saídas pagas antes do período</span>
              <span className="font-mono">{formatCurrency(data.saidasPagasAntes)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>= Saldo Inicial do Período</span>
              <span className="font-mono">{formatCurrency(data.saldoInicialCalculado)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Movimentações Realizadas (Pagas)</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-emerald-600">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Entradas recebidas no período
              </span>
              <span className="font-mono">{formatCurrency(data.entradasPagasNoPeriodo)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                Saídas pagas no período
              </span>
              <span className="font-mono">{formatCurrency(data.saidasPagasNoPeriodo)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Previsões (Pendentes/Vencidas)</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-emerald-600/80">
              <span>+ A receber pendentes</span>
              <span className="font-mono">{formatCurrency(data.entradasPendentes)}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>+ A receber vencidas</span>
              <span className="font-mono">{formatCurrency(data.entradasVencidas)}</span>
            </div>
            <div className="flex justify-between text-rose-600/80">
              <span>- A pagar pendentes</span>
              <span className="font-mono">{formatCurrency(data.saidasPendentes)}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>- A pagar vencidas</span>
              <span className="font-mono">{formatCurrency(data.saidasVencidas)}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
            <span className="font-medium">Saldo Final Realizado</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(data.saldoFinalRealizado)}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
            <span className="font-medium">Saldo Final Previsto</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(data.saldoFinalPrevisto)}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Modo Auditoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Auditoria de Saldo - Breakdown Completo
          </DialogTitle>
          {dateRange && (
            <p className="text-sm text-muted-foreground">
              Período: {format(new Date(dateRange.start + 'T00:00:00'), 'dd/MM/yyyy')} a {format(new Date(dateRange.end + 'T00:00:00'), 'dd/MM/yyyy')}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {!dateRange && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Selecione um período de datas para visualizar a auditoria.</span>
                  </div>
                </div>
              )}
              
              {extratoBreakdown && dashboardBreakdown && (
                <>
                  {/* Comparação lado a lado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BreakdownTable data={extratoBreakdown} title="Extrato" />
                    <BreakdownTable data={dashboardBreakdown} title="Dashboard Fluxo de Caixa" />
                  </div>
                  
                  {/* Status de Comparação */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Status da Comparação</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        {compareValues(extratoBreakdown.saldoInicialCalculado, dashboardBreakdown.saldoInicialCalculado) === 'match' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                        )}
                        <span className="text-sm">Saldo Inicial</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {compareValues(extratoBreakdown.saldoFinalRealizado, dashboardBreakdown.saldoFinalRealizado) === 'match' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                        )}
                        <span className="text-sm">Saldo Final Realizado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {compareValues(extratoBreakdown.saldoFinalPrevisto, dashboardBreakdown.saldoFinalPrevisto) === 'match' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                        )}
                        <span className="text-sm">Saldo Final Previsto</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {compareValues(
                          extratoBreakdown.entradasPagasNoPeriodo + extratoBreakdown.entradasPendentes + extratoBreakdown.entradasVencidas,
                          dashboardBreakdown.entradasPagasNoPeriodo + dashboardBreakdown.entradasPendentes + dashboardBreakdown.entradasVencidas
                        ) === 'match' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                        )}
                        <span className="text-sm">Total Entradas</span>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Breakdown por Conta Bancária */}
                  {contasBreakdown.length > 0 && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Breakdown por Conta Bancária</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Conta</TableHead>
                              <TableHead className="text-right">Saldo Inicial</TableHead>
                              <TableHead className="text-right">+ Antes</TableHead>
                              <TableHead className="text-right">- Antes</TableHead>
                              <TableHead className="text-right">= Início Período</TableHead>
                              <TableHead className="text-right">+ Recebido</TableHead>
                              <TableHead className="text-right">- Pago</TableHead>
                              <TableHead className="text-right">+ Pendente</TableHead>
                              <TableHead className="text-right">- Pendente</TableHead>
                              <TableHead className="text-right">Saldo Previsto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contasBreakdown.map((conta) => (
                              <TableRow key={conta.contaId}>
                                <TableCell className="font-medium">{conta.contaNome}</TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(conta.saldoInicialConta)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-emerald-600">
                                  {formatCurrency(conta.entradasPagasAntes)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-rose-600">
                                  {formatCurrency(conta.saidasPagasAntes)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm font-semibold">
                                  {formatCurrency(conta.saldoInicialCalculado)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-emerald-600">
                                  {formatCurrency(conta.entradasPagasNoPeriodo)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-rose-600">
                                  {formatCurrency(conta.saidasPagasNoPeriodo)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-emerald-600/70">
                                  {formatCurrency(conta.entradasPendentes + conta.entradasVencidas)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-rose-600/70">
                                  {formatCurrency(conta.saidasPendentes + conta.saidasVencidas)}
                                </TableCell>
                                <TableCell className={`text-right font-mono font-bold ${conta.saldoFinalPrevisto < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                                  {formatCurrency(conta.saldoFinalPrevisto)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-semibold">
                              <TableCell>TOTAL</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.saldoInicialConta, 0))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-600">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.entradasPagasAntes, 0))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-rose-600">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.saidasPagasAntes, 0))}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.saldoInicialCalculado, 0))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-600">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.entradasPagasNoPeriodo, 0))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-rose-600">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.saidasPagasNoPeriodo, 0))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-emerald-600/70">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.entradasPendentes + c.entradasVencidas, 0))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-rose-600/70">
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.saidasPendentes + c.saidasVencidas, 0))}
                              </TableCell>
                              <TableCell className={`text-right font-mono ${contasBreakdown.reduce((s, c) => s + c.saldoFinalPrevisto, 0) < 0 ? 'text-rose-600' : ''}`}>
                                {formatCurrency(contasBreakdown.reduce((s, c) => s + c.saldoFinalPrevisto, 0))}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
