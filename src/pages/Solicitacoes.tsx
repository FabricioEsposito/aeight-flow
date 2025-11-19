import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, Clock, FileText } from 'lucide-react';

interface SolicitacaoAjuste {
  id: string;
  tipo_lancamento: string;
  lancamento_id: string;
  data_vencimento_atual: string;
  data_vencimento_solicitada: string;
  solicitante_id: string;
  aprovador_id: string | null;
  motivo_solicitacao: string;
  motivo_rejeicao: string | null;
  status: string;
  created_at: string;
  data_resposta: string | null;
  valor_original: number;
  juros_atual: number;
  juros_solicitado: number;
  multa_atual: number;
  multa_solicitada: number;
  desconto_atual: number;
  desconto_solicitado: number;
  plano_conta_id: string | null;
  centro_custo: string | null;
  conta_bancaria_id: string | null;
  solicitante: {
    nome: string;
    email: string;
  };
  aprovador?: {
    nome: string;
    email: string;
  };
}

export default function Solicitacoes() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAjuste[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    solicitacao: SolicitacaoAjuste | null;
    action: 'aprovar' | 'rejeitar' | null;
  }>({
    open: false,
    solicitacao: null,
    action: null,
  });

  useEffect(() => {
    loadSolicitacoes();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('solicitacoes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitacoes_ajuste_financeiro',
        },
        () => {
          loadSolicitacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const loadSolicitacoes = async () => {
    try {
      let query = supabase
        .from('solicitacoes_ajuste_financeiro')
        .select('*')
        .order('created_at', { ascending: false });

      // Se não for admin, mostrar apenas suas solicitações
      if (!isAdmin) {
        query = query.eq('solicitante_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Buscar perfis dos solicitantes e aprovadores
      const solicitacoesComPerfis = await Promise.all(
        (data || []).map(async (sol) => {
          const { data: solicitanteData } = await supabase
            .from('profiles')
            .select('nome, email')
            .eq('id', sol.solicitante_id)
            .maybeSingle();
          
          let aprovadorData = null;
          if (sol.aprovador_id) {
            const { data: aprovador } = await supabase
              .from('profiles')
              .select('nome, email')
              .eq('id', sol.aprovador_id)
              .maybeSingle();
            aprovadorData = aprovador;
          }
          
          return {
            ...sol,
            solicitante: solicitanteData || { nome: 'Desconhecido', email: '' },
            aprovador: aprovadorData,
          };
        })
      );
      
      setSolicitacoes(solicitacoesComPerfis);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as solicitações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmDialog = (solicitacao: SolicitacaoAjuste, action: 'aprovar' | 'rejeitar') => {
    setConfirmDialog({ open: true, solicitacao, action });
  };

  const handleAprovarAjuste = async () => {
    const solicitacao = confirmDialog.solicitacao;
    if (!solicitacao) return;

    setLoading(true);
    try {
      const tabela = solicitacao.tipo_lancamento === 'receber' ? 'contas_receber' : 'contas_pagar';
      
      // Construir objeto de atualização apenas com campos alterados
      const updateData: any = {};
      
      if (solicitacao.data_vencimento_atual !== solicitacao.data_vencimento_solicitada) {
        updateData.data_vencimento = solicitacao.data_vencimento_solicitada;
      }
      
      if ((solicitacao.juros_atual || 0) !== (solicitacao.juros_solicitado || 0)) {
        updateData.juros = solicitacao.juros_solicitado || 0;
      }
      
      if ((solicitacao.multa_atual || 0) !== (solicitacao.multa_solicitada || 0)) {
        updateData.multa = solicitacao.multa_solicitada || 0;
      }
      
      if ((solicitacao.desconto_atual || 0) !== (solicitacao.desconto_solicitado || 0)) {
        updateData.desconto = solicitacao.desconto_solicitado || 0;
      }
      
      // Buscar valores atuais do lançamento
      const { data: lancamentoAtual, error: fetchError } = await supabase
        .from(tabela)
        .select('plano_conta_id, centro_custo, conta_bancaria_id')
        .eq('id', solicitacao.lancamento_id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (lancamentoAtual && solicitacao.plano_conta_id && lancamentoAtual.plano_conta_id !== solicitacao.plano_conta_id) {
        updateData.plano_conta_id = solicitacao.plano_conta_id;
      }
      
      if (lancamentoAtual && solicitacao.centro_custo && lancamentoAtual.centro_custo !== solicitacao.centro_custo) {
        updateData.centro_custo = solicitacao.centro_custo;
      }
      
      if (lancamentoAtual && solicitacao.conta_bancaria_id && lancamentoAtual.conta_bancaria_id !== solicitacao.conta_bancaria_id) {
        updateData.conta_bancaria_id = solicitacao.conta_bancaria_id;
      }
      
      // Atualizar apenas se houver mudanças
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from(tabela)
          .update(updateData)
          .eq('id', solicitacao.lancamento_id);

        if (updateError) throw updateError;
      }

      // Marcar solicitação como aprovada
      const { error: solicitacaoError } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .update({
          status: 'aprovado',
          aprovador_id: user?.id,
          data_resposta: new Date().toISOString(),
        })
        .eq('id', solicitacao.id);

      if (solicitacaoError) throw solicitacaoError;

      toast({
        title: 'Ajuste aprovado',
        description: 'O lançamento foi atualizado com sucesso.',
      });

      loadSolicitacoes();
      setConfirmDialog({ open: false, solicitacao: null, action: null });
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar o ajuste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitarAjuste = async () => {
    const solicitacao = confirmDialog.solicitacao;
    if (!solicitacao) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .update({
          status: 'rejeitado',
          aprovador_id: user?.id,
          data_resposta: new Date().toISOString(),
        })
        .eq('id', solicitacao.id);

      if (error) throw error;

      toast({
        title: 'Solicitação rejeitada',
        description: 'A solicitação foi rejeitada.',
      });

      loadSolicitacoes();
      setConfirmDialog({ open: false, solicitacao: null, action: null });
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: 'Não foi possível rejeitar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarSolicitacao = async (solicitacaoId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .delete()
        .eq('id', solicitacaoId);

      if (error) throw error;

      toast({
        title: 'Solicitação cancelada',
        description: 'A solicitação foi cancelada com sucesso.',
      });

      loadSolicitacoes();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast({
        title: 'Erro ao cancelar',
        description: 'Não foi possível cancelar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><X className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderSolicitacaoCard = (solicitacao: SolicitacaoAjuste) => {
    const hasChangedDate = solicitacao.data_vencimento_atual !== solicitacao.data_vencimento_solicitada;
    const hasChangedJuros = solicitacao.juros_atual !== solicitacao.juros_solicitado;
    const hasChangedMulta = solicitacao.multa_atual !== solicitacao.multa_solicitada;
    const hasChangedDesconto = solicitacao.desconto_atual !== solicitacao.desconto_solicitado;

    return (
      <Card key={solicitacao.id}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left Section - Info */}
            <div className="flex-1 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <Badge variant={solicitacao.tipo_lancamento === 'receber' ? 'default' : 'secondary'}>
                  {solicitacao.tipo_lancamento === 'receber' ? 'Contas a Receber' : 'Contas a Pagar'}
                </Badge>
                {getStatusBadge(solicitacao.status)}
              </div>

              {/* Solicitante */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Solicitado por:</p>
                  <p className="font-medium">{solicitacao.solicitante.nome}</p>
                  <p className="text-xs text-muted-foreground">{solicitacao.solicitante.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data:</p>
                  <p className="font-medium">{format(new Date(solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              {/* Aprovador (se houver) */}
              {solicitacao.aprovador && solicitacao.data_resposta && (
                <div className="bg-secondary/30 p-3 rounded-md text-sm">
                  <p className="text-muted-foreground">
                    {solicitacao.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'} por: <span className="font-medium">{solicitacao.aprovador.nome}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(solicitacao.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}

              {/* Motivo */}
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs font-medium text-muted-foreground mb-1">Motivo da Solicitação:</p>
                <p className="text-sm">{solicitacao.motivo_solicitacao}</p>
              </div>

              {/* Alterações */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Alterações Solicitadas</p>
                <div className="grid gap-2">
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span className="text-muted-foreground">Valor Original:</span>
                    <span className="font-medium">R$ {solicitacao.valor_original.toFixed(2)}</span>
                  </div>
                  {hasChangedDate && (
                    <div className="flex justify-between text-sm py-2 border-b bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Data de Vencimento:</span>
                      <span className="font-medium text-orange-600">
                        {format(new Date(solicitacao.data_vencimento_atual), 'dd/MM/yyyy')} → {format(new Date(solicitacao.data_vencimento_solicitada), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  {hasChangedJuros && (
                    <div className="flex justify-between text-sm py-2 border-b bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Juros:</span>
                      <span className="font-medium text-orange-600">
                        R$ {solicitacao.juros_atual.toFixed(2)} → R$ {solicitacao.juros_solicitado.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {hasChangedMulta && (
                    <div className="flex justify-between text-sm py-2 border-b bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Multa:</span>
                      <span className="font-medium text-orange-600">
                        R$ {solicitacao.multa_atual.toFixed(2)} → R$ {solicitacao.multa_solicitada.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {hasChangedDesconto && (
                    <div className="flex justify-between text-sm py-2 bg-orange-50 -mx-3 px-3">
                      <span className="text-muted-foreground">Desconto:</span>
                      <span className="font-medium text-orange-600">
                        R$ {solicitacao.desconto_atual.toFixed(2)} → R$ {solicitacao.desconto_solicitado.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            {isAdmin && solicitacao.status === 'pendente' && (
              <div className="flex flex-col gap-2 pt-12">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleOpenConfirmDialog(solicitacao, 'aprovar')}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 border-red-300"
                  onClick={() => handleOpenConfirmDialog(solicitacao, 'rejeitar')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Rejeitar
                </Button>
              </div>
            )}
            
            {/* Cancel button for common users on pending requests */}
            {!isAdmin && solicitacao.status === 'pendente' && (
              <div className="flex flex-col gap-2 pt-12">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 border-red-300"
                  onClick={() => handleCancelarSolicitacao(solicitacao.id)}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const solicitacoesPendentes = solicitacoes.filter(s => s.status === 'pendente');
  const solicitacoesHistorico = solicitacoes.filter(s => s.status !== 'pendente');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando solicitações...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Solicitações de Ajuste</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? 'Gerencie e aprove solicitações de ajustes financeiros' 
                : 'Acompanhe suas solicitações de ajuste'}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="pendentes" className="w-full">
            <TabsList>
              <TabsTrigger value="pendentes" className="gap-2">
                <Clock className="w-4 h-4" />
                Pendentes ({solicitacoesPendentes.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <FileText className="w-4 h-4" />
                Histórico ({solicitacoesHistorico.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="space-y-4 mt-6">
              {solicitacoesPendentes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                  </CardContent>
                </Card>
              ) : (
                solicitacoesPendentes.map(renderSolicitacaoCard)
              )}
            </TabsContent>

            <TabsContent value="historico" className="space-y-4 mt-6">
              {solicitacoesHistorico.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum histórico disponível</p>
                  </CardContent>
                </Card>
              ) : (
                solicitacoesHistorico.map(renderSolicitacaoCard)
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {solicitacoes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Você ainda não fez nenhuma solicitação</p>
                </CardContent>
              </Card>
            ) : (
              solicitacoes.map(renderSolicitacaoCard)
            )}
          </div>
        )}
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, solicitacao: null, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'aprovar' ? 'Aprovar Solicitação?' : 'Rejeitar Solicitação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'aprovar' ? (
                <>
                  Você está prestes a aprovar esta solicitação. As seguintes alterações serão aplicadas ao lançamento:
                  {confirmDialog.solicitacao && (
                    <div className="mt-4 space-y-2 text-sm">
                      {confirmDialog.solicitacao.data_vencimento_atual !== confirmDialog.solicitacao.data_vencimento_solicitada && (
                        <p>
                          <strong>Data de Vencimento:</strong> {format(new Date(confirmDialog.solicitacao.data_vencimento_atual), 'dd/MM/yyyy')} → {format(new Date(confirmDialog.solicitacao.data_vencimento_solicitada), 'dd/MM/yyyy')}
                        </p>
                      )}
                      {confirmDialog.solicitacao.juros_atual !== confirmDialog.solicitacao.juros_solicitado && (
                        <p>
                          <strong>Juros:</strong> R$ {confirmDialog.solicitacao.juros_atual.toFixed(2)} → R$ {confirmDialog.solicitacao.juros_solicitado.toFixed(2)}
                        </p>
                      )}
                      {confirmDialog.solicitacao.multa_atual !== confirmDialog.solicitacao.multa_solicitada && (
                        <p>
                          <strong>Multa:</strong> R$ {confirmDialog.solicitacao.multa_atual.toFixed(2)} → R$ {confirmDialog.solicitacao.multa_solicitada.toFixed(2)}
                        </p>
                      )}
                      {confirmDialog.solicitacao.desconto_atual !== confirmDialog.solicitacao.desconto_solicitado && (
                        <p>
                          <strong>Desconto:</strong> R$ {confirmDialog.solicitacao.desconto_atual.toFixed(2)} → R$ {confirmDialog.solicitacao.desconto_solicitado.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                'Você está prestes a rejeitar esta solicitação. Esta ação não poderá ser desfeita.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.action === 'aprovar' ? handleAprovarAjuste : handleRejeitarAjuste}
              disabled={loading}
              className={confirmDialog.action === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading ? 'Processando...' : confirmDialog.action === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}