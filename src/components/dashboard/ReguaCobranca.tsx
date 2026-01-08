import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Send, Loader2 } from 'lucide-react';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ParcelaVencida {
  id: string;
  descricao: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_emails: string[];
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
  const [sendingClientId, setSendingClientId] = useState<string | null>(null);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  
  const { 
    loading: sendingAll, 
    sendCollectionEmail, 
    fetchLastEmailsByClient, 
    formatLastEmail,
    getMaxEmailsPerDay 
  } = useEmailLogs();

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
    if (diasAtraso <= 1) return '1x às 11h';
    if (diasAtraso <= 3) return '2x às 11h e 15h';
    if (diasAtraso <= 5) return '3x às 11h, 15h e 17h';
    if (diasAtraso <= 7) return '3x + CC Sócios';
    return '3x às 11h, 15h e 17h';
  };

  const fetchParcelas = async () => {
    setLoading(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Buscar todas contas a receber para calcular total de receita (apenas de contratos)
      let queryReceita = supabase
        .from('contas_receber')
        .select('valor')
        .not('parcela_id', 'is', null) // Somente parcelas de contratos
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim);

      if (centroCusto && centroCusto !== 'todos') {
        queryReceita = queryReceita.eq('centro_custo', centroCusto);
      }

      const { data: receitaData } = await queryReceita;
      const receita = receitaData?.reduce((sum, conta) => sum + (conta.valor || 0), 0) || 0;
      setTotalReceita(receita);

      // Buscar parcelas vencidas (apenas de contratos)
      let query = supabase
        .from('contas_receber')
        .select('*, clientes(id, razao_social, nome_fantasia, email)')
        .not('parcela_id', 'is', null) // Somente parcelas de contratos
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
        const vencimento = new Date(conta.data_vencimento + 'T00:00:00');
        const agora = new Date();
        const diasAtraso = Math.floor((agora.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
        const nivelInfo = getNivelAtraso(diasAtraso);
        const regraCobranca = getRegraCobranca(diasAtraso);
        const percentualReceita = receita > 0 ? ((conta.valor || 0) / receita) * 100 : 0;

        return {
          id: conta.id,
          descricao: conta.descricao,
          cliente_id: conta.clientes?.id || '',
          cliente_nome: conta.clientes?.nome_fantasia || conta.clientes?.razao_social || 'N/A',
          cliente_emails: conta.clientes?.email || [],
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

      // Fetch last email dates for all clients
      const clienteIds = [...new Set(parcelasVencidas.map(p => p.cliente_id).filter(id => id))];
      if (clienteIds.length > 0) {
        await fetchLastEmailsByClient(clienteIds);
      }
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

  const handleSendEmail = async (clienteId: string) => {
    setSendingClientId(clienteId);
    await sendCollectionEmail(clienteId, true); // force: true for manual sends
    setSendingClientId(null);
    // Refresh last email dates
    const clienteIds = [...new Set(parcelas.map(p => p.cliente_id).filter(id => id))];
    await fetchLastEmailsByClient(clienteIds);
  };

  const handleSendAllEmails = async () => {
    setShowConfirmAll(false);
    await sendCollectionEmail();
    // Refresh last email dates
    const clienteIds = [...new Set(parcelas.map(p => p.cliente_id).filter(id => id))];
    await fetchLastEmailsByClient(clienteIds);
  };

  // Group parcelas by client to show unique clients
  const uniqueClients = [...new Map(parcelas.map(p => [p.cliente_id, p])).values()];

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Régua de Cobrança</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>Total vencido: {formatCurrency(totalVencido)}</span>
                <span>•</span>
                <span>{parcelas.length} parcela(s) em atraso</span>
              </div>
            </div>
            {parcelas.length > 0 && (
              <Button 
                onClick={() => setShowConfirmAll(true)} 
                disabled={sendingAll}
                className="gap-2"
              >
                {sendingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar Todas as Cobranças
              </Button>
            )}
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
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhuma parcela vencida encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  parcelas.map((parcela) => {
                    const lastEmail = formatLastEmail(parcela.cliente_id);
                    const hasEmails = parcela.cliente_emails && parcela.cliente_emails.length > 0;
                    const isSending = sendingClientId === parcela.cliente_id;

                    return (
                      <TableRow key={parcela.id}>
                        <TableCell className="text-center">
                          {format(new Date(parcela.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
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
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendEmail(parcela.cliente_id)}
                                  disabled={!hasEmails || isSending || sendingAll}
                                  className="gap-1"
                                >
                                  {isSending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Mail className="h-3 w-3" />
                                  )}
                                  Enviar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {!hasEmails 
                                  ? 'Cliente sem e-mail cadastrado' 
                                  : `Enviar para: ${parcela.cliente_emails.join(', ')}`
                                }
                              </TooltipContent>
                            </Tooltip>
                            {lastEmail && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {lastEmail}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmAll} onOpenChange={setShowConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar E-mails de Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar e-mails de cobrança para todos os clientes com parcelas vencidas.
              O sistema respeitará o limite de frequência de acordo com os dias de atraso de cada cliente.
              <br /><br />
              <strong>Clientes afetados:</strong> {uniqueClients.length}
              <br />
              <strong>Total em aberto:</strong> {formatCurrency(totalVencido)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendAllEmails}>
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
