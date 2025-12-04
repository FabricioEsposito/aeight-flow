import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, FileText, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

interface ClienteDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNome: string;
}

interface Contrato {
  id: string;
  numero_contrato: string;
  servicos: any;
  valor_total: number;
  tem_go_live: boolean;
  status: string;
}

interface Contato {
  telefone: string | null;
  emails: string[] | null;
}

interface Recebimento {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_vencimento_original: string | null;
  data_recebimento: string | null;
  status: string;
  status_pagamento: 'pago_em_dia' | 'pago_atrasado' | 'em_dia' | 'vencido';
}

export function ClienteDetalhesDialog({ 
  open, 
  onOpenChange, 
  clienteId, 
  clienteNome 
}: ClienteDetalhesDialogProps) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [contato, setContato] = useState<Contato | null>(null);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState<Map<string, { codigo: string; nome: string }>>(new Map());

  useEffect(() => {
    if (open && clienteId) {
      fetchClienteDetalhes();
    }
  }, [open, clienteId]);

  const fetchClienteDetalhes = async () => {
    setLoading(true);
    try {
      // Buscar serviços para mapear
      const { data: servicosData } = await supabase
        .from('servicos')
        .select('id, codigo, nome');
      
      const servicosMap = new Map<string, { codigo: string; nome: string }>();
      servicosData?.forEach(s => servicosMap.set(s.id, { codigo: s.codigo, nome: s.nome }));
      setServicos(servicosMap);

      // Buscar contatos do cliente
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('telefone, email')
        .eq('id', clienteId)
        .maybeSingle();

      if (clienteData) {
        setContato({
          telefone: clienteData.telefone,
          emails: clienteData.email
        });
      }

      // Buscar contratos do cliente
      const { data: contratosData } = await supabase
        .from('contratos')
        .select('id, numero_contrato, servicos, valor_total, status')
        .eq('cliente_id', clienteId)
        .eq('status', 'ativo');

      // Verificar quais contratos têm go live
      const contratosComGoLive: Contrato[] = [];
      
      for (const contrato of contratosData || []) {
        // Verificar se há parcela do tipo 'go_live' ou 'GoLive'
        const { data: parcelasGoLive } = await supabase
          .from('parcelas_contrato')
          .select('id')
          .eq('contrato_id', contrato.id)
          .ilike('tipo', '%go%live%')
          .limit(1);

        contratosComGoLive.push({
          ...contrato,
          tem_go_live: (parcelasGoLive?.length || 0) > 0
        });
      }

      setContratos(contratosComGoLive);

      // Buscar recebimentos do cliente
      const { data: recebimentosData } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data_vencimento', { ascending: false });

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const recebimentosProcessados: Recebimento[] = (recebimentosData || []).map(rec => {
        const dataVencimento = new Date(rec.data_vencimento_original || rec.data_vencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        
        let statusPagamento: 'pago_em_dia' | 'pago_atrasado' | 'em_dia' | 'vencido';
        
        if (rec.status === 'pago' && rec.data_recebimento) {
          const dataRecebimento = new Date(rec.data_recebimento);
          dataRecebimento.setHours(0, 0, 0, 0);
          statusPagamento = dataRecebimento <= dataVencimento ? 'pago_em_dia' : 'pago_atrasado';
        } else if (rec.status === 'pendente') {
          statusPagamento = dataVencimento >= hoje ? 'em_dia' : 'vencido';
        } else {
          statusPagamento = 'em_dia';
        }

        return {
          id: rec.id,
          descricao: rec.descricao,
          valor: rec.valor,
          data_vencimento: rec.data_vencimento,
          data_vencimento_original: rec.data_vencimento_original,
          data_recebimento: rec.data_recebimento,
          status: rec.status || 'pendente',
          status_pagamento: statusPagamento
        };
      });

      setRecebimentos(recebimentosProcessados);
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
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

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getServicoNome = (servicosJson: any): string => {
    if (!servicosJson) return '-';
    try {
      const servicosArray = typeof servicosJson === 'string' ? JSON.parse(servicosJson) : servicosJson;
      if (Array.isArray(servicosArray) && servicosArray.length > 0) {
        return servicosArray.map((s: any) => {
          // Se for uma string (ID direto), buscar no map
          if (typeof s === 'string') {
            const servico = servicos.get(s);
            return servico ? `${servico.codigo} - ${servico.nome}` : '-';
          }
          // Se for um objeto, buscar pelo servico_id ou id
          const servico = servicos.get(s.servico_id || s.id);
          return servico ? `${servico.codigo} - ${servico.nome}` : s.nome || '-';
        }).join(', ');
      }
    } catch {
      return '-';
    }
    return '-';
  };

  const getStatusBadge = (status: 'pago_em_dia' | 'pago_atrasado' | 'em_dia' | 'vencido') => {
    switch (status) {
      case 'pago_em_dia':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pago em Dia
          </Badge>
        );
      case 'pago_atrasado':
        return (
          <Badge className="bg-yellow-500 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pago Atrasado
          </Badge>
        );
      case 'em_dia':
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Em Dia
          </Badge>
        );
      case 'vencido':
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Vencido
          </Badge>
        );
    }
  };

  // Estatísticas de pagamento
  const estatisticas = {
    pagoEmDia: recebimentos.filter(r => r.status_pagamento === 'pago_em_dia').length,
    pagoAtrasado: recebimentos.filter(r => r.status_pagamento === 'pago_atrasado').length,
    emDia: recebimentos.filter(r => r.status_pagamento === 'em_dia').length,
    vencido: recebimentos.filter(r => r.status_pagamento === 'vencido').length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{clienteNome}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="contratos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contratos">Contratos</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
              <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
            </TabsList>

            <TabsContent value="contratos" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Contratos Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  {contratos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum contrato ativo encontrado
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Contrato</TableHead>
                            <TableHead>Serviço</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-center">Go Live</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contratos.map((contrato) => (
                            <TableRow key={contrato.id}>
                              <TableCell className="font-medium">{contrato.numero_contrato}</TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {getServicoNome(contrato.servicos)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(contrato.valor_total)}
                              </TableCell>
                              <TableCell className="text-center">
                                {contrato.tem_go_live ? (
                                  <Badge className="bg-green-500">Sim</Badge>
                                ) : (
                                  <Badge variant="outline">Não</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contatos" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span>{contato?.telefone || 'Não informado'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex flex-col gap-1">
                      {contato?.emails && contato.emails.length > 0 ? (
                        contato.emails.map((email, index) => (
                          <span key={index}>{email}</span>
                        ))
                      ) : (
                        <span>Não informado</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recebimentos" className="mt-4 space-y-4">
              {/* Cards de estatísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pago em Dia</p>
                      <p className="text-lg font-bold text-green-600">{estatisticas.pagoEmDia}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pago Atrasado</p>
                      <p className="text-lg font-bold text-yellow-600">{estatisticas.pagoAtrasado}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Em Dia</p>
                      <p className="text-lg font-bold text-blue-600">{estatisticas.emDia}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Vencido</p>
                      <p className="text-lg font-bold text-red-600">{estatisticas.vencido}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Histórico de Recebimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {recebimentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum recebimento encontrado
                    </p>
                  ) : (
                    <div className="rounded-md border max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Vencimento</TableHead>
                            <TableHead className="text-center">Recebimento</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recebimentos.map((rec) => (
                            <TableRow key={rec.id}>
                              <TableCell className="max-w-[150px] truncate">{rec.descricao}</TableCell>
                              <TableCell className="text-right">{formatCurrency(rec.valor)}</TableCell>
                              <TableCell className="text-center">
                                {formatDate(rec.data_vencimento_original || rec.data_vencimento)}
                              </TableCell>
                              <TableCell className="text-center">
                                {rec.data_recebimento ? formatDate(rec.data_recebimento) : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(rec.status_pagamento)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
