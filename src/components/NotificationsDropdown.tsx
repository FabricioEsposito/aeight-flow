import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HierarchyRequest {
  id: string;
  user_id: string;
  requested_role: 'admin' | 'user';
  status: string;
  created_at: string;
  profiles: {
    nome: string;
    email: string;
  };
}

interface SolicitacaoAjuste {
  id: string;
  tipo_lancamento: string;
  lancamento_id: string;
  data_vencimento_atual: string;
  data_vencimento_solicitada: string;
  solicitante_id: string;
  motivo_solicitacao: string;
  status: string;
  created_at: string;
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
  profiles: {
    nome: string;
    email: string;
  };
}

export function NotificationsDropdown() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<HierarchyRequest[]>([]);
  const [solicitacoesAjuste, setSolicitacoesAjuste] = useState<SolicitacaoAjuste[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; solicitacao: SolicitacaoAjuste | null }>({
    open: false,
    solicitacao: null,
  });

  useEffect(() => {
    if (user) {
      checkIfAdmin();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
      loadSolicitacoesAjuste();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hierarchy_requests',
            filter: 'status=eq.pending',
          },
          () => {
            loadRequests();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitacoes_ajuste_financeiro',
            filter: 'status=eq.pendente',
          },
          () => {
            loadSolicitacoesAjuste();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkIfAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('hierarchy_requests')
        .select(`
          *,
          profiles!hierarchy_requests_user_id_fkey (
            nome,
            email
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadSolicitacoesAjuste = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('solicitacoes_ajuste_financeiro')
        .select(`
          *,
          profiles!solicitacoes_ajuste_financeiro_solicitante_id_fkey (
            nome,
            email
          )
        `)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSolicitacoesAjuste(data || []);
    } catch (error) {
      console.error('Error loading solicitações:', error);
    }
  };

  const handleApprove = async (requestId: string, userId: string, requestedRole: string) => {
    setLoading(true);
    try {
      // Update the request status
      const { error: updateError } = await (supabase as any)
        .from('hierarchy_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Update the user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: requestedRole as 'admin' | 'user' })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      toast({
        title: 'Solicitação aprovada',
        description: 'O nível de hierarquia foi atualizado com sucesso.',
      });

      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('hierarchy_requests')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Solicitação recusada',
        description: 'A solicitação foi recusada.',
      });

      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Erro ao recusar',
        description: 'Não foi possível recusar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Usuário';
  };

  const handleOpenConfirmDialog = (solicitacao: SolicitacaoAjuste) => {
    setConfirmDialog({ open: true, solicitacao });
  };

  const handleAprovarAjuste = async () => {
    const solicitacao = confirmDialog.solicitacao;
    if (!solicitacao) return;

    setLoading(true);
    try {
      const tabela = solicitacao.tipo_lancamento === 'receber' ? 'contas_receber' : 'contas_pagar';
      
      // Atualizar o lançamento
      const { error: updateError } = await supabase
        .from(tabela)
        .update({
          data_vencimento: solicitacao.data_vencimento_solicitada,
          juros: solicitacao.juros_solicitado,
          multa: solicitacao.multa_solicitada,
          desconto: solicitacao.desconto_solicitado,
          plano_conta_id: solicitacao.plano_conta_id,
          centro_custo: solicitacao.centro_custo,
          conta_bancaria_id: solicitacao.conta_bancaria_id,
        })
        .eq('id', solicitacao.lancamento_id);

      if (updateError) throw updateError;

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

      loadSolicitacoesAjuste();
      setConfirmDialog({ open: false, solicitacao: null });
    } catch (error) {
      console.error('Error approving adjustment:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar o ajuste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejeitarAjuste = async (solicitacaoId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .update({
          status: 'rejeitado',
          aprovador_id: user?.id,
          data_resposta: new Date().toISOString(),
        })
        .eq('id', solicitacaoId);

      if (error) throw error;

      toast({
        title: 'Ajuste rejeitado',
        description: 'A solicitação foi rejeitada.',
      });

      loadSolicitacoesAjuste();
    } catch (error) {
      console.error('Error rejecting adjustment:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: 'Não foi possível rejeitar o ajuste.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  const totalNotifications = requests.length + solicitacoesAjuste.length;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {totalNotifications}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Notificações ({totalNotifications})</h3>
            {totalNotifications === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma notificação
              </p>
            ) : (
              <div className="space-y-4">
                {/* Solicitações de Hierarquia */}
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 border rounded-lg space-y-2 bg-background"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">Hierarquia</Badge>
                        <p className="text-xs text-muted-foreground">
                          {request.profiles?.nome || request.profiles?.email}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          Solicita mudança para: <strong>{getRoleLabel(request.requested_role)}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleApprove(request.id, request.user_id, request.requested_role)}
                        disabled={loading}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReject(request.id)}
                        disabled={loading}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Recusar
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Solicitações de Ajuste Financeiro */}
                {solicitacoesAjuste.map((solicitacao) => (
                  <div
                    key={solicitacao.id}
                    className="p-3 border rounded-lg space-y-2 bg-background"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">
                          Ajuste - {solicitacao.tipo_lancamento === 'receber' ? 'Receber' : 'Pagar'}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Solicitante: {solicitacao.profiles?.nome || solicitacao.profiles?.email}
                        </p>
                        <div className="text-sm mt-2 space-y-1">
                          <p><strong>Motivo:</strong> {solicitacao.motivo_solicitacao}</p>
                          {solicitacao.data_vencimento_atual !== solicitacao.data_vencimento_solicitada && (
                            <p className="text-xs">
                              <strong>Vencimento:</strong> {format(new Date(solicitacao.data_vencimento_atual), 'dd/MM/yyyy')} → {format(new Date(solicitacao.data_vencimento_solicitada), 'dd/MM/yyyy')}
                            </p>
                          )}
                          {solicitacao.juros_atual !== solicitacao.juros_solicitado && (
                            <p className="text-xs">
                              <strong>Juros:</strong> R$ {solicitacao.juros_atual.toFixed(2)} → R$ {solicitacao.juros_solicitado.toFixed(2)}
                            </p>
                          )}
                          {solicitacao.multa_atual !== solicitacao.multa_solicitada && (
                            <p className="text-xs">
                              <strong>Multa:</strong> R$ {solicitacao.multa_atual.toFixed(2)} → R$ {solicitacao.multa_solicitada.toFixed(2)}
                            </p>
                          )}
                          {solicitacao.desconto_atual !== solicitacao.desconto_solicitado && (
                            <p className="text-xs">
                              <strong>Desconto:</strong> R$ {solicitacao.desconto_atual.toFixed(2)} → R$ {solicitacao.desconto_solicitado.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleOpenConfirmDialog(solicitacao)}
                        disabled={loading}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleRejeitarAjuste(solicitacao.id)}
                        disabled={loading}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Recusar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Confirmação */}
      {confirmDialog.open && confirmDialog.solicitacao && (
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, solicitacao: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Você tem certeza que deseja aprovar esta solicitação de ajuste?</p>
                <div className="mt-4 p-3 bg-muted rounded-md text-sm space-y-1">
                  <p><strong>Solicitante:</strong> {confirmDialog.solicitacao.profiles?.nome}</p>
                  <p><strong>Motivo:</strong> {confirmDialog.solicitacao.motivo_solicitacao}</p>
                  {confirmDialog.solicitacao.data_vencimento_atual !== confirmDialog.solicitacao.data_vencimento_solicitada && (
                    <p>
                      <strong>Vencimento:</strong> {format(new Date(confirmDialog.solicitacao.data_vencimento_atual), 'dd/MM/yyyy')} → {format(new Date(confirmDialog.solicitacao.data_vencimento_solicitada), 'dd/MM/yyyy')}
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
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAprovarAjuste} disabled={loading}>
                {loading ? 'Aprovando...' : 'Confirmar Aprovação'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
