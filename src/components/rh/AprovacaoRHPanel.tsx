import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SolicitacaoRH {
  id: string;
  solicitante_id: string;
  status: string;
  tipo: string;
  descricao: string | null;
  detalhes: any;
  mes_referencia: number;
  ano_referencia: number;
  motivo_rejeicao: string | null;
  created_at: string;
}

export function AprovacaoRHPanel() {
  const [detailDialog, setDetailDialog] = useState<SolicitacaoRH | null>(null);
  const [rejectDialog, setRejectDialog] = useState<SolicitacaoRH | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-aprovacao-rh'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_aprovacao_rh')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SolicitacaoRH[];
    },
  });

  const pendentes = solicitacoes.filter(s => s.status === 'pendente');
  const historico = solicitacoes.filter(s => s.status !== 'pendente');

  const handleAprovar = async (solicitacao: SolicitacaoRH) => {
    setProcessing(true);
    try {
      // Update solicitacao status
      const { error: updateError } = await supabase
        .from('solicitacoes_aprovacao_rh')
        .update({
          status: 'aprovado_rh',
          aprovador_rh_id: user?.id,
          data_aprovacao_rh: new Date().toISOString(),
        })
        .eq('id', solicitacao.id);

      if (updateError) throw updateError;

      // Update folha_pagamento records linked to this solicitacao
      await supabase
        .from('folha_pagamento')
        .update({ status: 'aprovado' })
        .eq('solicitacao_rh_id' as any, solicitacao.id);

      // Send notifications to admin and finance_manager
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'finance_manager']);

      const detalhes = solicitacao.detalhes || [];
      const totalLancamentos = Array.isArray(detalhes) ? detalhes.length : 0;
      const totalValor = Array.isArray(detalhes) 
        ? detalhes.reduce((sum: number, d: any) => sum + (d.valor_liquido || 0), 0)
        : 0;

      const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      for (const role of (adminRoles || [])) {
        await supabase.from('notificacoes').insert({
          user_id: role.user_id,
          titulo: 'Folha de Pagamento Aprovada pelo RH',
          mensagem: `A folha de pagamento de ${String(solicitacao.mes_referencia).padStart(2, '0')}/${solicitacao.ano_referencia} foi aprovada pelo Gerente de RH. ${totalLancamentos} lançamento(s) totalizando ${formatCurrency(totalValor)}. Confirme para atualizar o extrato.`,
          tipo: 'info',
          referencia_tipo: 'aprovacao_rh',
          referencia_id: solicitacao.id,
        });
      }

      toast({ title: 'Aprovado', description: 'Solicitação aprovada e notificações enviadas.' });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-aprovacao-rh'] });
    } catch (error: any) {
      console.error('Erro ao aprovar:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejeitar = async () => {
    if (!rejectDialog || !motivoRejeicao.trim()) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_aprovacao_rh')
        .update({
          status: 'rejeitado',
          aprovador_rh_id: user?.id,
          motivo_rejeicao: motivoRejeicao,
        })
        .eq('id', rejectDialog.id);

      if (error) throw error;

      // Notify the requester
      await supabase.from('notificacoes').insert({
        user_id: rejectDialog.solicitante_id,
        titulo: 'Solicitação de RH Rejeitada',
        mensagem: `Sua solicitação de ${rejectDialog.tipo} para ${String(rejectDialog.mes_referencia).padStart(2, '0')}/${rejectDialog.ano_referencia} foi rejeitada. Motivo: ${motivoRejeicao}`,
        tipo: 'warning',
        referencia_tipo: 'aprovacao_rh',
        referencia_id: rejectDialog.id,
      });

      toast({ title: 'Rejeitado', description: 'Solicitação rejeitada.' });
      setRejectDialog(null);
      setMotivoRejeicao('');
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-aprovacao-rh'] });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado_rh': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovado RH</Badge>;
      case 'aprovado_financeiro': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Processado</Badge>;
      case 'rejeitado': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Solicitações Pendentes ({pendentes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendentes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhuma solicitação pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Lançamentos</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((s) => {
                  const detalhes = Array.isArray(s.detalhes) ? s.detalhes : [];
                  const totalValor = detalhes.reduce((sum: number, d: any) => sum + (d.valor_liquido || 0), 0);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell><Badge variant="outline">{s.tipo === 'importacao' ? 'Importação' : 'Edição'}</Badge></TableCell>
                      <TableCell>{String(s.mes_referencia).padStart(2, '0')}/{s.ano_referencia}</TableCell>
                      <TableCell className="text-sm">{s.descricao || '-'}</TableCell>
                      <TableCell>{detalhes.length}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(totalValor)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setDetailDialog(s)} title="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" className="gap-1" onClick={() => handleAprovar(s)} disabled={processing}>
                            <CheckCircle2 className="w-4 h-4" />Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setRejectDialog(s); setMotivoRejeicao(''); }} disabled={processing}>
                            <XCircle className="w-4 h-4" />Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      {historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Aprovações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Lançamentos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.slice(0, 20).map((s) => {
                  const detalhes = Array.isArray(s.detalhes) ? s.detalhes : [];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell><Badge variant="outline">{s.tipo === 'importacao' ? 'Importação' : 'Edição'}</Badge></TableCell>
                      <TableCell>{String(s.mes_referencia).padStart(2, '0')}/{s.ano_referencia}</TableCell>
                      <TableCell>{detalhes.length}</TableCell>
                      <TableCell>{getStatusBadge(s.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDetailDialog(s)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-sm text-muted-foreground">Competência:</span><p className="font-medium">{String(detailDialog.mes_referencia).padStart(2, '0')}/{detailDialog.ano_referencia}</p></div>
                <div><span className="text-sm text-muted-foreground">Tipo:</span><p className="font-medium">{detailDialog.tipo === 'importacao' ? 'Importação' : 'Edição Individual'}</p></div>
                <div><span className="text-sm text-muted-foreground">Status:</span>{getStatusBadge(detailDialog.status)}</div>
              </div>
              {detailDialog.descricao && <p className="text-sm">{detailDialog.descricao}</p>}
              {detailDialog.motivo_rejeicao && (
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Motivo da rejeição:</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{detailDialog.motivo_rejeicao}</p>
                </div>
              )}
              {Array.isArray(detailDialog.detalhes) && detailDialog.detalhes.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>CNPJ/CPF</TableHead>
                      <TableHead className="text-right">Salário Base</TableHead>
                      <TableHead className="text-right">Valor Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailDialog.detalhes.map((d: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.razao_social || '-'}</TableCell>
                        <TableCell className="text-sm">{d.cnpj || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.salario_base || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.valor_liquido || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Informe o motivo da rejeição:</p>
            <Textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejeitar} disabled={!motivoRejeicao.trim() || processing}>
              {processing ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
