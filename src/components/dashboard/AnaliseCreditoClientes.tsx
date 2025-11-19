import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface ClienteAnalise {
  id: string;
  razao_social: string;
  aging_medio: number;
  total_a_receber: number;
  percentual_receita: number;
  score: string;
  score_color: string;
}

interface AnaliseCreditoClientesProps {
  dataInicio: string;
  dataFim: string;
  centroCusto?: string;
}

export function AnaliseCreditoClientes({ dataInicio, dataFim, centroCusto }: AnaliseCreditoClientesProps) {
  const [clientes, setClientes] = useState<ClienteAnalise[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReceita, setTotalReceita] = useState(0);

  useEffect(() => {
    fetchAnalise();
  }, [dataInicio, dataFim, centroCusto]);

  const getScoreInfo = (agingMedio: number): { score: string; color: string } => {
    if (agingMedio <= 1) return { score: 'Ótimo Pagador', color: 'bg-green-500' };
    if (agingMedio <= 3) return { score: 'Bom Pagador', color: 'bg-green-500' };
    if (agingMedio <= 5) return { score: 'Pagador Mediano', color: 'bg-yellow-500' };
    if (agingMedio <= 7) return { score: 'Péssimo Pagador', color: 'bg-red-500' };
    return { score: 'Péssimo Pagador', color: 'bg-red-500' };
  };

  const fetchAnalise = async () => {
    setLoading(true);
    try {
      // Buscar contas a receber no período
      let query = supabase
        .from('contas_receber')
        .select('*, clientes(id, razao_social)')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .eq('status', 'pendente');

      if (centroCusto && centroCusto !== 'todos') {
        query = query.eq('centro_custo', centroCusto);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calcular total de receita
      const receita = data?.reduce((sum, conta) => sum + (conta.valor || 0), 0) || 0;
      setTotalReceita(receita);

      // Agrupar por cliente e calcular métricas
      const clientesMap = new Map<string, any>();
      
      data?.forEach((conta: any) => {
        if (!conta.clientes) return;
        
        const clienteId = conta.clientes.id;
        const hoje = new Date();
        const vencimento = new Date(conta.data_vencimento_original || conta.data_vencimento);
        const aging = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

        if (!clientesMap.has(clienteId)) {
          clientesMap.set(clienteId, {
            id: clienteId,
            razao_social: conta.clientes.razao_social,
            total_a_receber: 0,
            soma_aging: 0,
            count_parcelas: 0,
          });
        }

        const cliente = clientesMap.get(clienteId);
        cliente.total_a_receber += conta.valor || 0;
        cliente.soma_aging += aging;
        cliente.count_parcelas += 1;
      });

      // Converter para array e calcular aging médio
      const clientesAnalise: ClienteAnalise[] = Array.from(clientesMap.values())
        .map((cliente) => {
          const agingMedio = cliente.count_parcelas > 0 
            ? cliente.soma_aging / cliente.count_parcelas 
            : 0;
          const percentualReceita = receita > 0 
            ? (cliente.total_a_receber / receita) * 100 
            : 0;
          const scoreInfo = getScoreInfo(agingMedio);

          return {
            id: cliente.id,
            razao_social: cliente.razao_social,
            aging_medio: Math.round(agingMedio),
            total_a_receber: cliente.total_a_receber,
            percentual_receita: percentualReceita,
            score: scoreInfo.score,
            score_color: scoreInfo.color,
          };
        })
        .sort((a, b) => b.total_a_receber - a.total_a_receber);

      setClientes(clientesAnalise);
    } catch (error) {
      console.error('Erro ao buscar análise de crédito:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Crédito - Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Crédito - Clientes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Score baseado no aging médio das parcelas a receber
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Aging Médio</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-right">Total a Receber</TableHead>
                <TableHead className="text-right">% Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum cliente encontrado no período
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.razao_social}</TableCell>
                    <TableCell className="text-center">
                      {cliente.aging_medio} dias
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cliente.score_color}>
                        {cliente.score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(cliente.total_a_receber)}
                    </TableCell>
                    <TableCell className="text-right">
                      {cliente.percentual_receita.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
