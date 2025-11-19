import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ParcelaVencida {
  id: string;
  descricao: string;
  cliente_nome: string;
  data_vencimento: string;
  valor: number;
  dias_atraso: number;
  nivel_atraso: string;
  nivel_color: string;
  regra_cobranca: string;
  percentual_receita: number;
}

interface ReguaCobrancaProps {
  dataInicio: string;
  dataFim: string;
  centroCusto?: string;
}

export function ReguaCobranca({ dataInicio, dataFim, centroCusto }: ReguaCobrancaProps) {
  const [parcelas, setParcelas] = useState<ParcelaVencida[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReceita, setTotalReceita] = useState(0);

  useEffect(() => {
    fetchParcelas();
  }, [dataInicio, dataFim, centroCusto]);

  const getNivelAtraso = (diasAtraso: number): { nivel: string; color: string } => {
    if (diasAtraso <= 1) return { nivel: 'Ótimo Pagador', color: 'bg-green-500' };
    if (diasAtraso <= 3) return { nivel: 'Bom Pagador', color: 'bg-green-500' };
    if (diasAtraso <= 5) return { nivel: 'Pagador Mediano', color: 'bg-yellow-500' };
    if (diasAtraso <= 7) return { nivel: 'Péssimo Pagador', color: 'bg-red-500' };
    return { nivel: 'Péssimo Pagador', color: 'bg-red-500' };
  };

  const getRegraCobranca = (diasAtraso: number): string => {
    if (diasAtraso <= 1) return 'Cobrar 1x no dia';
    if (diasAtraso <= 3) return 'Cobrar 2x no dia';
    if (diasAtraso <= 5) return 'Cobrar 3x no dia';
    if (diasAtraso <= 7) return 'Acionar Sócios';
    return 'Informar Negativação';
  };

  const fetchParcelas = async () => {
    setLoading(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Buscar todas contas a receber para calcular total de receita
      let queryReceita = supabase
        .from('contas_receber')
        .select('valor')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim);

      if (centroCusto && centroCusto !== 'todos') {
        queryReceita = queryReceita.eq('centro_custo', centroCusto);
      }

      const { data: receitaData } = await queryReceita;
      const receita = receitaData?.reduce((sum, conta) => sum + (conta.valor || 0), 0) || 0;
      setTotalReceita(receita);

      // Buscar parcelas vencidas
      let query = supabase
        .from('contas_receber')
        .select('*, clientes(razao_social)')
        .eq('status', 'pendente')
        .lt('data_vencimento', hoje)
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim);

      if (centroCusto && centroCusto !== 'todos') {
        query = query.eq('centro_custo', centroCusto);
      }

      const { data, error } = await query.order('data_vencimento', { ascending: true });
      if (error) throw error;

      const parcelasVencidas: ParcelaVencida[] = data?.map((conta: any) => {
        const vencimento = new Date(conta.data_vencimento);
        const agora = new Date();
        const diasAtraso = Math.floor((agora.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
        const nivelInfo = getNivelAtraso(diasAtraso);
        const regraCobranca = getRegraCobranca(diasAtraso);
        const percentualReceita = receita > 0 ? ((conta.valor || 0) / receita) * 100 : 0;

        return {
          id: conta.id,
          descricao: conta.descricao,
          cliente_nome: conta.clientes?.razao_social || 'N/A',
          data_vencimento: conta.data_vencimento,
          valor: conta.valor || 0,
          dias_atraso: diasAtraso,
          nivel_atraso: nivelInfo.nivel,
          nivel_color: nivelInfo.color,
          regra_cobranca: regraCobranca,
          percentual_receita: percentualReceita,
        };
      }) || [];

      setParcelas(parcelasVencidas);
    } catch (error) {
      console.error('Erro ao buscar régua de cobrança:', error);
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
          <CardTitle>Régua de Cobrança</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalVencido = parcelas.reduce((sum, p) => sum + p.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Régua de Cobrança</CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total vencido: {formatCurrency(totalVencido)}</span>
          <span>•</span>
          <span>{parcelas.length} parcela(s) em atraso</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Dias Atraso</TableHead>
                <TableHead className="text-center">Nível</TableHead>
                <TableHead className="text-center">Regra de Cobrança</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">% Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhuma parcela vencida encontrada
                  </TableCell>
                </TableRow>
              ) : (
                parcelas.map((parcela) => (
                  <TableRow key={parcela.id}>
                    <TableCell className="text-center">
                      {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{parcela.cliente_nome}</TableCell>
                    <TableCell>{parcela.descricao}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-destructive">
                        {parcela.dias_atraso} dias
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={parcela.nivel_color}>
                        {parcela.nivel_atraso}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">
                        {parcela.regra_cobranca}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parcela.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      {parcela.percentual_receita.toFixed(1)}%
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
