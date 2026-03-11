import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import {
  calcularFluxoCaixaMensal,
  prepararMovimentacoes,
  type ContaBancariaSaldo,
  type MovimentacaoFluxo,
} from '@/lib/fluxo-caixa-utils';

interface LancamentoFluxo {
  tipo: 'entrada' | 'saida';
  valor: number;
  data_vencimento: string;
  data_recebimento?: string;
  data_pagamento?: string;
  status: string;
  conta_bancaria_id?: string;
}

interface FluxoCaixaMensalProps {
  lancamentos: LancamentoFluxo[];
  contasBancarias: Array<{ id: string; saldo_inicial: number; data_inicio: string; descricao: string; banco: string }>;
  contaBancariaFilter: string[];
  movimentacoesAnteriores: Array<{ valor: number; tipo: 'entrada' | 'saida'; conta_bancaria_id: string | null }>;
  dateRange: { start: string; end: string } | undefined;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function FluxoCaixaMensal({
  lancamentos,
  contasBancarias,
  contaBancariaFilter,
  movimentacoesAnteriores,
  dateRange,
}: FluxoCaixaMensalProps) {
  const result = useMemo(() => {
    if (!dateRange) return null;

    const movimentacoesNoPeriodo = prepararMovimentacoes(
      lancamentos.filter(l => l.tipo === 'entrada').map(l => ({
        valor: l.valor,
        data_vencimento: l.data_vencimento,
        data_recebimento: l.data_recebimento || null,
        status: l.status,
        conta_bancaria_id: l.conta_bancaria_id || null,
      })),
      lancamentos.filter(l => l.tipo === 'saida').map(l => ({
        valor: l.valor,
        data_vencimento: l.data_vencimento,
        data_pagamento: l.data_pagamento || null,
        status: l.status,
        conta_bancaria_id: l.conta_bancaria_id || null,
      }))
    );

    return calcularFluxoCaixaMensal({
      dataInicio: dateRange.start,
      dataFim: dateRange.end,
      contasBancarias: contasBancarias.map(c => ({
        id: c.id,
        saldo_inicial: c.saldo_inicial,
        data_inicio: c.data_inicio,
      })),
      contasBancariasIds: contaBancariaFilter,
      movimentacoesAnteriores,
      movimentacoesNoPeriodo,
    });
  }, [dateRange?.start, dateRange?.end, lancamentos, contasBancarias, contaBancariaFilter, movimentacoesAnteriores]);

  if (!result || result.meses.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Selecione um período para visualizar o fluxo de caixa mensal.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Fluxo de Caixa Mensal</h2>
        <Badge variant="outline" className="text-xs">
          {result.meses.length} mês(es)
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Saldo Inicial</p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(result.saldoInicialPeriodo)}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/10">
          <p className="text-xs text-muted-foreground">Total Entradas</p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatCurrency(result.totalEntradasPeriodo)}</p>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10">
          <p className="text-xs text-muted-foreground">Total Saídas</p>
          <p className="text-lg font-bold text-destructive tabular-nums">{formatCurrency(result.totalSaidasPeriodo)}</p>
        </div>
        <div className={`p-3 rounded-lg ${result.saldoFinalPeriodo >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
          <p className="text-xs text-muted-foreground">Saldo Final</p>
          <p className={`text-lg font-bold tabular-nums ${result.saldoFinalPeriodo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(result.saldoFinalPeriodo)}
          </p>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Mês/Ano</TableHead>
              <TableHead className="min-w-[130px] text-right">Saldo Inicial</TableHead>
              <TableHead className="min-w-[130px] text-right">Entradas</TableHead>
              <TableHead className="min-w-[130px] text-right">Saídas</TableHead>
              <TableHead className="min-w-[130px] text-right">Saldo Final</TableHead>
              <TableHead className="min-w-[100px] text-right">Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.meses.map((mes) => {
              const resultado = mes.totalEntradas - mes.totalSaidas;
              return (
                <TableRow key={mes.mesAno}>
                  <TableCell className="font-medium">{mes.mesAnoFormatted}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(mes.saldoInicial)}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    <span className="flex items-center justify-end gap-1">
                      {mes.totalEntradas > 0 && <TrendingUp className="w-3 h-3" />}
                      {formatCurrency(mes.totalEntradas)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    <span className="flex items-center justify-end gap-1">
                      {mes.totalSaidas > 0 && <TrendingDown className="w-3 h-3" />}
                      {formatCurrency(mes.totalSaidas)}
                    </span>
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${mes.saldoFinal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(mes.saldoFinal)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={resultado >= 0 ? 'default' : 'destructive'} className="tabular-nums text-xs">
                      {resultado >= 0 ? '+' : ''}{formatCurrency(resultado)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        * Considera apenas lançamentos com status "pago/recebido". O saldo inicial de cada mês é o saldo final do mês anterior.
      </p>
    </Card>
  );
}