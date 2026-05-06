import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { openStorageFile } from '@/lib/storage-utils';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

type Step = 'rh' | 'financeiro';

export default function AprovacaoPrestadores() {
  const { permissions, isAdmin, isFinanceManager, loading: roleLoading } = useUserRole();
  const canRH = permissions.canApproveRH || isAdmin;
  const canFin = permissions.canApproveReembolsoFinanceiro || isAdmin || isFinanceManager;

  if (roleLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!canRH && !canFin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aprovações de Prestadores</h1>
        <p className="text-muted-foreground">Valide reembolsos e Notas Fiscais enviadas pelos prestadores e funcionários.</p>
      </div>
      <Tabs defaultValue={canRH ? 'rh' : 'financeiro'}>
        <TabsList>
          {canRH && <TabsTrigger value="rh">Aprovação RH</TabsTrigger>}
          {canFin && <TabsTrigger value="financeiro">Aprovação Financeiro</TabsTrigger>}
        </TabsList>
        {canRH && <TabsContent value="rh"><PainelStep step="rh" /></TabsContent>}
        {canFin && <TabsContent value="financeiro"><PainelStep step="financeiro" /></TabsContent>}
      </Tabs>
    </div>
  );
}

function PainelStep({ step }: { step: Step }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [aprovarItem, setAprovarItem] = useState<any>(null);
  const [rejeitarItem, setRejeitarItem] = useState<any>(null);
  const [motivo, setMotivo] = useState('');
  const [parcelaId, setParcelaId] = useState('');
  const [dataVenc, setDataVenc] = useState('');
  const [contaBanc, setContaBanc] = useState('');
  const [processing, setProcessing] = useState(false);

  const statusFiltro = step === 'rh' ? 'pendente_rh' : 'aprovado_rh';

  const { data: items = [] } = useQuery({
    queryKey: ['aprov-prestador', step],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_prestador' as any)
        .select('*, fornecedor:fornecedores(razao_social, nome_fantasia, cnpj_cpf)')
        .eq('status', statusFiltro)
        .order('created_at');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: parcelas = [] } = useQuery({
    queryKey: ['parcelas-prestador', aprovarItem?.fornecedor_id, aprovarItem?.mes_referencia, aprovarItem?.ano_referencia],
    enabled: !!aprovarItem && aprovarItem?.tipo === 'nf_mensal' && step === 'rh',
    queryFn: async () => {
      const { data: contratos } = await supabase
        .from('contratos')
        .select('id')
        .eq('fornecedor_id', aprovarItem.fornecedor_id);
      const ids = (contratos || []).map((c) => c.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from('parcelas_contrato')
        .select('id, numero_parcela, data_vencimento, valor, status, contrato:contratos(numero_contrato)')
        .in('contrato_id', ids)
        .order('data_vencimento');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contasBancarias = [] } = useQuery({
    queryKey: ['contas-bancarias-list'],
    enabled: step === 'financeiro',
    queryFn: async () => {
      const { data } = await supabase.from('contas_bancarias').select('id, descricao, banco').eq('status', 'ativo');
      return data || [];
    },
  });

  const handleAprovar = async () => {
    if (!aprovarItem) return;
    setProcessing(true);
    try {
      if (step === 'rh') {
        const update: any = {
          status: 'aprovado_rh',
          aprovador_rh_id: user!.id,
          data_aprovacao_rh: new Date().toISOString(),
        };
        if (aprovarItem.tipo === 'nf_mensal') {
          if (!parcelaId) throw new Error('Selecione a parcela');
          update.parcela_id = parcelaId;
          // Update conta_pagar with link_nf
          const { data: cp } = await supabase
            .from('contas_pagar').select('id').eq('parcela_id', parcelaId).maybeSingle();
          if (cp) {
            await supabase.from('contas_pagar').update({ link_nf: aprovarItem.arquivo_path } as any).eq('id', cp.id);
          }
        }
        const { error } = await supabase.from('solicitacoes_prestador' as any).update(update).eq('id', aprovarItem.id);
        if (error) throw error;
      } else {
        if (aprovarItem.tipo === 'reembolso') {
          if (!dataVenc) throw new Error('Defina a data de vencimento');
          // Get plano_conta 3.1.14
          const { data: plano } = await supabase.from('plano_contas').select('id').eq('codigo', '3.1.14').maybeSingle();
          const { data: cp, error: cpError } = await supabase.from('contas_pagar').insert({
            fornecedor_id: aprovarItem.fornecedor_id,
            descricao: `Reembolso - ${aprovarItem.descricao || ''}`.slice(0, 200),
            valor: aprovarItem.valor,
            data_competencia: dataVenc,
            data_vencimento: dataVenc,
            plano_conta_id: plano?.id || null,
            conta_bancaria_id: contaBanc || null,
            link_nf: aprovarItem.arquivo_path,
            status: 'pendente',
          } as any).select('id').single();
          if (cpError) throw cpError;
          await supabase.from('solicitacoes_prestador' as any).update({
            status: 'aprovado_financeiro',
            aprovador_financeiro_id: user!.id,
            data_aprovacao_financeiro: new Date().toISOString(),
            conta_pagar_id: cp.id,
            data_vencimento_pagamento: dataVenc,
            conta_bancaria_id: contaBanc || null,
          }).eq('id', aprovarItem.id);
        } else {
          // NF mensal já tem parcela vinculada
          await supabase.from('solicitacoes_prestador' as any).update({
            status: 'aprovado_financeiro',
            aprovador_financeiro_id: user!.id,
            data_aprovacao_financeiro: new Date().toISOString(),
          }).eq('id', aprovarItem.id);
        }
      }
      toast({ title: 'Aprovado!' });
      queryClient.invalidateQueries({ queryKey: ['aprov-prestador'] });
      setAprovarItem(null);
      setParcelaId(''); setDataVenc(''); setContaBanc('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejeitar = async () => {
    if (!rejeitarItem || !motivo.trim()) return;
    setProcessing(true);
    try {
      const update: any = step === 'rh'
        ? { status: 'rejeitado_rh', aprovador_rh_id: user!.id, data_aprovacao_rh: new Date().toISOString(), motivo_rejeicao_rh: motivo }
        : { status: 'rejeitado_financeiro', aprovador_financeiro_id: user!.id, data_aprovacao_financeiro: new Date().toISOString(), motivo_rejeicao_financeiro: motivo };
      const { error } = await supabase.from('solicitacoes_prestador' as any).update(update).eq('id', rejeitarItem.id);
      if (error) throw error;
      toast({ title: 'Rejeitado' });
      queryClient.invalidateQueries({ queryKey: ['aprov-prestador'] });
      setRejeitarItem(null); setMotivo('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pendentes</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pendência.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Mês ref.</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Anexo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell><Badge variant="outline">{s.tipo === 'nf_mensal' ? 'NF' : 'Reembolso'}</Badge></TableCell>
                  <TableCell className="text-sm">{s.fornecedor?.nome_fantasia || s.fornecedor?.razao_social}</TableCell>
                  <TableCell className="text-xs">{String(s.mes_referencia).padStart(2,'0')}/{s.ano_referencia}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{s.descricao}</TableCell>
                  <TableCell className="text-right text-sm">R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openStorageFile(s.arquivo_path, 'prestador-docs')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="default" onClick={() => setAprovarItem(s)}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejeitarItem(s)}><X className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!aprovarItem} onOpenChange={(o) => !o && setAprovarItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Aprovar solicitação</DialogTitle></DialogHeader>
            {aprovarItem && step === 'rh' && aprovarItem.tipo === 'nf_mensal' && (
              <div>
                <Label>Vincular à parcela</Label>
                <Select value={parcelaId} onValueChange={setParcelaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a parcela" /></SelectTrigger>
                  <SelectContent>
                    {parcelas.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.contrato?.numero_contrato} • Parcela {p.numero_parcela} • {format(new Date(p.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')} • R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {aprovarItem && step === 'financeiro' && aprovarItem.tipo === 'reembolso' && (
              <div className="space-y-3">
                <div>
                  <Label>Data de vencimento</Label>
                  <Input type="date" value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} />
                </div>
                <div>
                  <Label>Conta bancária</Label>
                  <Select value={contaBanc} onValueChange={setContaBanc}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.descricao} - {c.banco}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Será criada uma conta a pagar com o plano 3.1.14 (Reembolso).</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAprovarItem(null)}>Cancelar</Button>
              <Button onClick={handleAprovar} disabled={processing}>
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!rejeitarItem} onOpenChange={(o) => !o && setRejeitarItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rejeitar</DialogTitle></DialogHeader>
            <Label>Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejeitarItem(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRejeitar} disabled={processing || !motivo.trim()}>Rejeitar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
