import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Send, Loader2, Filter, X, MailX, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Progress } from '@/components/ui/progress';

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
  centroCusto?: string[];
}

const NIVEIS_ATRASO = [
  { value: 'todos', label: 'Todos os níveis' },
  { value: 'otimo', label: 'Ótimo Pagador (1 dia)' },
  { value: 'bom', label: 'Bom Pagador (2-3 dias)' },
  { value: 'mediano', label: 'Pagador Mediano (4-5 dias)' },
  { value: 'pessimo', label: 'Péssimo Pagador (6+ dias)' },
];


export function ReguaCobranca({ dataInicio, dataFim, centroCusto }: ReguaCobrancaProps) {
  const [parcelas, setParcelas] = useState<ParcelaVencida[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReceita, setTotalReceita] = useState(0);
  const [sendingClientId, setSendingClientId] = useState<string | null>(null);
  const [showConfirmBatch, setShowConfirmBatch] = useState(false);
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('todos');
  
  
  // Seleção em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { 
    loading: sendingAll, 
    emailQuota,
    sendCollectionEmail, 
    fetchLastEmailsByClient, 
    formatLastEmail,
    fetchEmailQuota,
  } = useEmailLogs();

  useEffect(() => {
    fetchParcelas();
    fetchEmailQuota();
  }, [dataInicio, dataFim, centroCusto]);

  // Limpar seleção quando os filtros mudam
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filtroCliente, filtroNivel]);

  const getNivelAtraso = (diasAtraso: number): { nivel: string; color: string; key: string } => {
    if (diasAtraso <= 1) return { nivel: 'Ótimo Pagador', color: 'bg-green-500', key: 'otimo' };
    if (diasAtraso <= 3) return { nivel: 'Bom Pagador', color: 'bg-green-500', key: 'bom' };
    if (diasAtraso <= 5) return { nivel: 'Pagador Mediano', color: 'bg-yellow-500', key: 'mediano' };
    return { nivel: 'Péssimo Pagador', color: 'bg-red-500', key: 'pessimo' };
  };

  // ATUALIZADO: Nova regra de cobrança (1x/dia para todos)
  const getRegraCobranca = (diasAtraso: number): string => {
    if (diasAtraso <= 7) return '1x às 11h';
    return '1x às 11h + CC Sócios';
  };

  const fetchParcelas = async () => {
    setLoading(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      // Verificar se há filtro de período (se vazio, busca tudo)
      const temFiltroPeriodo = dataInicio && dataFim;

      // Buscar todas contas a receber para calcular total de receita (contratos + avulsos com serviço)
      // Query 1: Parcelas de contratos
      let queryReceitaContratos = supabase
        .from('contas_receber')
        .select('valor')
        .not('parcela_id', 'is', null);
      
      if (temFiltroPeriodo) {
        queryReceitaContratos = queryReceitaContratos
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim);
      }

      // Query 2: Lançamentos avulsos com serviço vinculado
      let queryReceitaAvulsos = supabase
        .from('contas_receber')
        .select('valor')
        .is('parcela_id', null)
        .like('observacoes', 'Serviço:%');
      
      if (temFiltroPeriodo) {
        queryReceitaAvulsos = queryReceitaAvulsos
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim);
      }

      if (centroCusto && centroCusto.length > 0) {
        queryReceitaContratos = queryReceitaContratos.in('centro_custo', centroCusto);
        queryReceitaAvulsos = queryReceitaAvulsos.in('centro_custo', centroCusto);
      }

      const [{ data: receitaContratosData }, { data: receitaAvulsosData }] = await Promise.all([
        queryReceitaContratos,
        queryReceitaAvulsos
      ]);
      
      const receitaContratos = receitaContratosData?.reduce((sum, conta) => sum + (conta.valor || 0), 0) || 0;
      const receitaAvulsos = receitaAvulsosData?.reduce((sum, conta) => sum + (conta.valor || 0), 0) || 0;
      const receita = receitaContratos + receitaAvulsos;
      setTotalReceita(receita);

      // Buscar parcelas vencidas (contratos + avulsos com serviço)
      // Query 1: Parcelas de contratos vencidas
      let queryContratos = supabase
        .from('contas_receber')
        .select('*, clientes(id, razao_social, nome_fantasia, email)')
        .not('parcela_id', 'is', null)
        .eq('status', 'pendente')
        .lt('data_vencimento', hoje);
      
      if (temFiltroPeriodo) {
        queryContratos = queryContratos
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim);
      }

      // Query 2: Lançamentos avulsos com serviço vinculado vencidos
      let queryAvulsos = supabase
        .from('contas_receber')
        .select('*, clientes(id, razao_social, nome_fantasia, email)')
        .is('parcela_id', null)
        .like('observacoes', 'Serviço:%')
        .eq('status', 'pendente')
        .lt('data_vencimento', hoje);
      
      if (temFiltroPeriodo) {
        queryAvulsos = queryAvulsos
          .gte('data_vencimento', dataInicio)
          .lte('data_vencimento', dataFim);
      }

      if (centroCusto && centroCusto.length > 0) {
        queryContratos = queryContratos.in('centro_custo', centroCusto);
        queryAvulsos = queryAvulsos.in('centro_custo', centroCusto);
      }

      const [resultContratos, resultAvulsos] = await Promise.all([
        queryContratos.order('data_vencimento', { ascending: true }),
        queryAvulsos.order('data_vencimento', { ascending: true })
      ]);

      if (resultContratos.error) throw resultContratos.error;
      if (resultAvulsos.error) throw resultAvulsos.error;

      // Combinar resultados
      const combinedData = [...(resultContratos.data || []), ...(resultAvulsos.data || [])]
        .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());


      const parcelasVencidas: ParcelaVencida[] = combinedData?.map((conta: any) => {
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

  // Filtrar parcelas com base nos filtros
  const parcelasFiltradas = useMemo(() => {
    return parcelas.filter(p => {
      // Filtro por cliente
      if (filtroCliente && !p.cliente_nome.toLowerCase().includes(filtroCliente.toLowerCase())) {
        return false;
      }
      
      // Filtro por nível
      if (filtroNivel !== 'todos') {
        const nivelInfo = getNivelAtraso(p.dias_atraso);
        if (nivelInfo.key !== filtroNivel) {
          return false;
        }
      }
      
      
      return true;
    });
  }, [parcelas, filtroCliente, filtroNivel]);

  // Lista de clientes únicos para o filtro
  const clientesUnicos = useMemo(() => {
    return [...new Set(parcelas.map(p => p.cliente_nome))].sort();
  }, [parcelas]);

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
    // Refresh last email dates and quota
    const clienteIds = [...new Set(parcelas.map(p => p.cliente_id).filter(id => id))];
    await fetchLastEmailsByClient(clienteIds);
    await fetchEmailQuota();
  };

  const handleSendBatchEmails = async () => {
    setShowConfirmBatch(false);
    
    // Obter clientes únicos das parcelas selecionadas
    const clientesParaEnviar = [...new Set(
      parcelasFiltradas
        .filter(p => selectedIds.has(p.id))
        .map(p => p.cliente_id)
        .filter(id => id)
    )];
    
    // Enviar email para cada cliente selecionado
    for (const clienteId of clientesParaEnviar) {
      await sendCollectionEmail(clienteId, true);
    }
    
    // Refresh last email dates and quota
    const clienteIds = [...new Set(parcelas.map(p => p.cliente_id).filter(id => id))];
    await fetchLastEmailsByClient(clienteIds);
    await fetchEmailQuota();
    
    // Limpar seleção
    setSelectedIds(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Só seleciona parcelas de clientes que têm e-mail
      const allIds = new Set(
        parcelasFiltradas
          .filter(p => p.cliente_emails && p.cliente_emails.length > 0)
          .map(p => p.id)
      );
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // Contagem de parcelas selecionáveis (com e-mail)
  const parcelasComEmail = parcelasFiltradas.filter(p => p.cliente_emails && p.cliente_emails.length > 0);

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const limparFiltros = () => {
    setFiltroCliente('');
    setFiltroNivel('todos');
  };

  const temFiltrosAtivos = filtroCliente || filtroNivel !== 'todos';

  // Calcular estatísticas dos selecionados
  const selectedParcelas = parcelasFiltradas.filter(p => selectedIds.has(p.id));
  const selectedTotal = selectedParcelas.reduce((sum, p) => sum + p.valor, 0);
  const selectedClientes = [...new Set(selectedParcelas.map(p => p.cliente_id).filter(id => id))];

  // Calcular quota percentage
  const quotaPercentage = emailQuota ? (emailQuota.today_count / emailQuota.daily_limit) * 100 : 0;
  const isQuotaLow = emailQuota && emailQuota.remaining <= 10;
  const isQuotaCritical = emailQuota && emailQuota.remaining <= 5;

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

  const totalVencido = parcelasFiltradas.reduce((sum, p) => sum + p.valor, 0);
  const parcelasSemEmail = parcelasFiltradas.filter(p => !p.cliente_emails || p.cliente_emails.length === 0);
  const allSelected = parcelasComEmail.length > 0 && selectedIds.size === parcelasComEmail.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < parcelasComEmail.length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Régua de Cobrança</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span>Total vencido: {formatCurrency(totalVencido)}</span>
                  <span>•</span>
                  <span>{parcelasFiltradas.length} parcela(s) em atraso</span>
                  {parcelasSemEmail.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-destructive flex items-center gap-1">
                        <MailX className="h-3 w-3" />
                        {parcelasSemEmail.length} sem e-mail
                      </span>
                    </>
                  )}
                  {parcelas.length !== parcelasFiltradas.length && (
                    <>
                      <span>•</span>
                      <span className="text-primary">({parcelas.length} total)</span>
                    </>
                  )}
                </div>
              </div>
              {selectedIds.size > 0 && (
                <Button 
                  onClick={() => setShowConfirmBatch(true)} 
                  disabled={sendingAll}
                  className="gap-2"
                >
                  {sendingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar {selectedIds.size} Cobrança(s)
                </Button>
              )}
            </div>

            {/* Indicador de Quota de E-mails */}
            {emailQuota && (
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                isQuotaCritical 
                  ? 'bg-destructive/10 border-destructive/30' 
                  : isQuotaLow 
                    ? 'bg-yellow-500/10 border-yellow-500/30' 
                    : 'bg-muted/50 border-border'
              }`}>
                <div className="flex items-center gap-2">
                  {isQuotaCritical ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : isQuotaLow ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm font-medium">Quota de E-mails:</span>
                </div>
                <div className="flex-1 max-w-[200px]">
                  <Progress 
                    value={quotaPercentage} 
                    className={`h-2 ${
                      isQuotaCritical 
                        ? '[&>div]:bg-destructive' 
                        : isQuotaLow 
                          ? '[&>div]:bg-yellow-500' 
                          : '[&>div]:bg-green-500'
                    }`}
                  />
                </div>
                <span className={`text-sm font-medium ${
                  isQuotaCritical 
                    ? 'text-destructive' 
                    : isQuotaLow 
                      ? 'text-yellow-600' 
                      : 'text-muted-foreground'
                }`}>
                  {emailQuota.today_count}/{emailQuota.daily_limit} enviados
                </span>
                <span className="text-xs text-muted-foreground">
                  ({emailQuota.remaining} restantes)
                </span>
              </div>
            )}
            
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <Input
                placeholder="Buscar cliente..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-[200px] h-9"
              />
              
              <Select value={filtroNivel} onValueChange={setFiltroNivel}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Nível de atraso" />
                </SelectTrigger>
                <SelectContent>
                  {NIVEIS_ATRASO.map(nivel => (
                    <SelectItem key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {temFiltrosAtivos && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={limparFiltros}
                  className="h-9 gap-1"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                      className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                    />
                  </TableHead>
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
                {parcelasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      {parcelas.length === 0 
                        ? 'Nenhuma parcela vencida encontrada'
                        : 'Nenhuma parcela encontrada com os filtros aplicados'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  parcelasFiltradas.map((parcela) => {
                    const lastEmail = formatLastEmail(parcela.cliente_id);
                    const hasEmails = parcela.cliente_emails && parcela.cliente_emails.length > 0;
                    const isSending = sendingClientId === parcela.cliente_id;
                    const isSelected = selectedIds.has(parcela.id);

                    return (
                      <TableRow 
                        key={parcela.id} 
                        className={`${isSelected ? 'bg-muted/50' : ''} ${!hasEmails ? 'opacity-60' : ''}`}
                      >
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSelectOne(parcela.id, checked as boolean)}
                                  aria-label={`Selecionar ${parcela.cliente_nome}`}
                                  disabled={!hasEmails}
                                  className={!hasEmails ? 'cursor-not-allowed' : ''}
                                />
                              </div>
                            </TooltipTrigger>
                            {!hasEmails && (
                              <TooltipContent>
                                Cliente sem e-mail cadastrado
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          {format(new Date(parcela.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {parcela.cliente_nome}
                            {!hasEmails && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <MailX className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Cliente sem e-mail cadastrado
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium cursor-help">
                                {parcela.regra_cobranca}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                {parcela.dias_atraso >= 8 
                                  ? '1 e-mail/dia às 11h com CC para financeiro + sócios'
                                  : '1 e-mail/dia às 11h com CC para financeiro'
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
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

      <AlertDialog open={showConfirmBatch} onOpenChange={setShowConfirmBatch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar E-mails de Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar e-mails de cobrança para os clientes selecionados.
              <br /><br />
              <strong>Parcelas selecionadas:</strong> {selectedIds.size}
              <br />
              <strong>Clientes afetados:</strong> {selectedClientes.length}
              <br />
              <strong>Total em aberto:</strong> {formatCurrency(selectedTotal)}
              {emailQuota && (
                <>
                  <br /><br />
                  <span className={isQuotaLow ? 'text-yellow-600 font-medium' : ''}>
                    <strong>Quota restante:</strong> {emailQuota.remaining} e-mails
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendBatchEmails}>
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
