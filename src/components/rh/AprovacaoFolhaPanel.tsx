import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, Clock, Eye, Loader2, DollarSign, FileCheck2, AlertCircle } from 'lucide-react';
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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function AprovacaoFolhaPanel() {
  const [detailDialog, setDetailDialog] = useState<SolicitacaoRH | null>(null);
  const [rejectDialog, setRejectDialog] = useState<SolicitacaoRH | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processing, setProcessing] = useState(false);
  const [solicitanteNomes, setSolicitanteNomes] = useState<Record<string, string>>({});
  const [fornecedoresMap, setFornecedoresMap] = useState<Record<string, { nome_fantasia: string; cnpj: string }>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-aprovacao-folha'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_aprovacao_rh')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []) as SolicitacaoRH[];

      const ids = Array.from(new Set(list.map(s => s.solicitante_id).filter(Boolean)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .in('id', ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p.nome || p.email || '-'; });
        setSolicitanteNomes(map);
      }

      // Collect all CNPJs from detalhes to fetch fornecedor nome_fantasia
      const cnpjs = Array.from(new Set(
        list.flatMap(s => (Array.isArray(s.detalhes) ? s.detalhes : []).map((d: any) => d.cnpj).filter(Boolean))
      ));
      if (cnpjs.length) {
        const { data: forns } = await (supabase
          .from('fornecedores')
          .select('cnpj, nome_fantasia, razao_social') as any)
          .in('cnpj', cnpjs as string[]);
        const fmap: Record<string, { nome_fantasia: string; cnpj: string }> = {};
        (forns || []).forEach((f: any) => {
          fmap[f.cnpj] = { nome_fantasia: f.nome_fantasia || f.razao_social || '-', cnpj: f.cnpj };
        });
        setFornecedoresMap(fmap);
      }
      return list;
    },
  });

  const pendentes = useMemo(
    () => solicitacoes.filter(s => s.status === 'pendente' || s.status === 'pendente_aprovacao_rh' || s.status === 'aprovado_rh'),
    [solicitacoes]
  );
  const historico = useMemo(
    () => solicitacoes.filter(s => s.status === 'aprovado_financeiro' || s.status === 'rejeitado'),
    [solicitacoes]
  );

  const kpis = useMemo(() => {
    const now = new Date();
    const valorPendente = pendentes.reduce((sum, s) => {
      const det = Array.isArray(s.detalhes) ? s.detalhes : [];
      return sum + det.reduce((a: number, d: any) => a + (d.valor_liquido || 0), 0);
    }, 0);
    const aprovadasMes = historico.filter(s =>
      s.status === 'aprovado_financeiro' &&
      new Date(s.created_at).getMonth() === now.getMonth() &&
      new Date(s.created_at).getFullYear() === now.getFullYear()
    ).length;
    const rejeitadas = historico.filter(s => s.status === 'rejeitado').length;
    return { pendentes: pendentes.length, valorPendente, aprovadasMes, rejeitadas };
  }, [pendentes, historico]);

  const approveOne = async (solicitacao: SolicitacaoRH) => {
    const { data: folhas, error: folhaError } = await (supabase
      .from('folha_pagamento')
      .select('id, parcela_id, conta_pagar_id, valor_liquido') as any)
      .eq('solicitacao_rh_id', solicitacao.id);
    if (folhaError) throw folhaError;

    const detalhes = Array.isArray(solicitacao.detalhes) ? solicitacao.detalhes : [];

    for (const folha of (folhas || [])) {
      const detalhe = detalhes.find((d: any) => d.parcela_id === folha.parcela_id);
      const updateData: any = { valor: folha.valor_liquido };
      if (detalhe?.data_vencimento) updateData.data_vencimento = detalhe.data_vencimento;

      if (folha.parcela_id) {
        await supabase.from('parcelas_contrato').update(updateData).eq('id', folha.parcela_id);
      }
      const cp: any = { valor: folha.valor_liquido };
      if (detalhe?.data_vencimento) {
        cp.data_vencimento = detalhe.data_vencimento;
        cp.data_competencia = detalhe.data_vencimento;
      }
      if (folha.conta_pagar_id) {
        await supabase.from('contas_pagar').update(cp).eq('id', folha.conta_pagar_id);
      } else if (folha.parcela_id) {
        await supabase.from('contas_pagar').update(cp).eq('parcela_id', folha.parcela_id);
      }
      await supabase.from('folha_pagamento').update({ status: 'processado' }).eq('id', folha.id);
    }

    await supabase
      .from('solicitacoes_aprovacao_rh')
      .update({
        status: 'aprovado_financeiro',
        aprovador_financeiro_id: user?.id,
        data_aprovacao_financeiro: new Date().toISOString(),
      } as any)
      .eq('id', solicitacao.id);

    await supabase.from('notificacoes').insert({
      user_id: solicitacao.solicitante_id,
      titulo: 'Solicitação de Folha Aprovada',
      mensagem: `Sua solicitação de ${String(solicitacao.mes_referencia).padStart(2, '0')}/${solicitacao.ano_referencia} foi aprovada pelo Financeiro e o extrato foi atualizado.`,
      tipo: 'success',
      referencia_tipo: 'aprovacao_rh',
      referencia_id: solicitacao.id,
    });
  };

  const handleAprovar = async (solicitacao: SolicitacaoRH) => {
    setProcessing(true);
    try {
      await approveOne(solicitacao);
      toast({ title: 'Aprovado', description: 'Valores propagados para o extrato.' });
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-aprovacao-folha'] });
    } catch (error: any) {
      console.error('Erro ao aprovar:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAprovarLote = async () => {
    const toApprove = pendentes.filter(s => selectedIds.includes(s.id));
    if (toApprove.length === 0) return;
    setProcessing(true);
    let ok = 0, fail = 0;
    for (const s of toApprove) {
      try {
        await approveOne(s);
        ok++;
      } catch (e: any) {
        console.error('Erro ao aprovar', s.id, e);
        fail++;
      }
    }
    toast({
      title: 'Aprovação em lote concluída',
      description: `${ok} aprovada(s)${fail ? `, ${fail} com erro` : ''}.`,
      variant: fail ? 'destructive' : 'default',
    });
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ['solicitacoes-aprovacao-folha'] });
    setProcessing(false);
  };

  const handleRejeitar = async () => {
    if (!rejectDialog || !motivoRejeicao.trim()) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_aprovacao_rh')
        .update({
          status: 'rejeitado',
          aprovador_financeiro_id: user?.id,
          motivo_rejeicao: motivoRejeicao,
        } as any)
        .eq('id', rejectDialog.id);
      if (error) throw error;

      await (supabase
        .from('folha_pagamento')
        .update({ status: 'rejeitado' }) as any)
        .eq('solicitacao_rh_id', rejectDialog.id);

      await supabase.from('notificacoes').insert({
        user_id: rejectDialog.solicitante_id,
        titulo: 'Solicitação de Folha Rejeitada',
        mensagem: `Sua solicitação de ${String(rejectDialog.mes_referencia).padStart(2, '0')}/${rejectDialog.ano_referencia} foi rejeitada. Motivo: ${motivoRejeicao}`,
        tipo: 'warning',
        referencia_tipo: 'aprovacao_rh',
        referencia_id: rejectDialog.id,
      });

      toast({ title: 'Rejeitado', description: 'Solicitação rejeitada.' });
      setRejectDialog(null);
      setMotivoRejeicao('');
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-aprovacao-folha'] });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
      case 'pendente_aprovacao_rh':
      case 'aprovado_rh':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado_financeiro':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const renderTable = (rows: SolicitacaoRH[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Solicitante</TableHead>
          <TableHead>Competência</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Lançamentos</TableHead>
          <TableHead className="text-right">Valor Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => {
          const detalhes = Array.isArray(s.detalhes) ? s.detalhes : [];
          const totalValor = detalhes.reduce((sum: number, d: any) => sum + (d.valor_liquido || 0), 0);
          return (
            <TableRow key={s.id}>
              <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell className="text-sm">{solicitanteNomes[s.solicitante_id] || '-'}</TableCell>
              <TableCell>{String(s.mes_referencia).padStart(2, '0')}/{s.ano_referencia}</TableCell>
              <TableCell><Badge variant="outline">{s.tipo === 'importacao' ? 'Importação' : 'Edição'}</Badge></TableCell>
              <TableCell className="text-right">{detalhes.length}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(totalValor)}</TableCell>
              <TableCell>{getStatusBadge(s.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setDetailDialog(s)} title="Ver detalhes">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {showActions && (
                    <>
                      <Button size="sm" className="gap-1" onClick={() => handleAprovar(s)} disabled={processing}>
                        <CheckCircle2 className="w-4 h-4" />Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setRejectDialog(s); setMotivoRejeicao(''); }} disabled={processing}>
                        <XCircle className="w-4 h-4" />Rejeitar
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{kpis.pendentes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Pendente</p>
              <p className="text-lg font-bold">{formatCurrency(kpis.valorPendente)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center"><FileCheck2 className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Aprovadas (mês)</p>
              <p className="text-2xl font-bold">{kpis.aprovadasMes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center"><XCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Rejeitadas</p>
              <p className="text-2xl font-bold">{kpis.rejeitadas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({historico.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                Solicitações Pendentes de Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendentes.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">Nenhuma solicitação pendente.</p>
              ) : renderTable(pendentes, true)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">Nenhum histórico ainda.</p>
              ) : renderTable(historico.slice(0, 50), false)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                <div className="col-span-3"><span className="text-sm text-muted-foreground">Solicitante:</span><p className="font-medium">{solicitanteNomes[detailDialog.solicitante_id] || '-'}</p></div>
              </div>
              {detailDialog.descricao && <p className="text-sm">{detailDialog.descricao}</p>}
              {detailDialog.motivo_rejeicao && (
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Motivo da rejeição:</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{detailDialog.motivo_rejeicao}</p>
                  </div>
                </div>
              )}
              {Array.isArray(detailDialog.detalhes) && detailDialog.detalhes.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>CNPJ/CPF</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Salário Base</TableHead>
                      <TableHead className="text-right">Valor Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailDialog.detalhes.map((d: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.razao_social || '-'}</TableCell>
                        <TableCell className="text-sm">{d.cnpj || '-'}</TableCell>
                        <TableCell className="text-sm">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</TableCell>
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
