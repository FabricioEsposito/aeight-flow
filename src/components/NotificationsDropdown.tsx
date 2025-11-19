import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

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

export function NotificationsDropdown() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<HierarchyRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [solicitacoesCount, setSolicitacoesCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkIfAdmin();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
      loadSolicitacoesCount();
      
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
            loadSolicitacoesCount();
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

  const loadSolicitacoesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('solicitacoes_ajuste_financeiro')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');

      if (error) throw error;

      setSolicitacoesCount(count || 0);
    } catch (error) {
      console.error('Error loading solicitações count:', error);
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
        title: 'Solicitação rejeitada',
        description: 'A solicitação foi rejeitada.',
      });

      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: 'Não foi possível rejeitar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Usuário';
  };

  const totalNotifications = requests.length + solicitacoesCount;

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {totalNotifications}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Notificações</h3>
            
            {totalNotifications === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma notificação pendente
              </p>
            ) : (
              <div className="space-y-4">
                {/* Solicitações de Hierarquia */}
                {requests.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Solicitações de Hierarquia</p>
                    {requests.map((request) => (
                      <div key={request.id} className="bg-secondary/50 p-3 rounded-md mb-2">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">{request.profiles.nome}</p>
                            <p className="text-xs text-muted-foreground">{request.profiles.email}</p>
                          </div>
                          <Badge variant="outline">{getRoleLabel(request.requested_role)}</Badge>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(request.id, request.user_id, request.requested_role)}
                            disabled={loading}
                            className="flex-1"
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(request.id)}
                            disabled={loading}
                            className="flex-1"
                          >
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Solicitações de Ajuste Financeiro */}
                {solicitacoesCount > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Solicitações de Ajuste</p>
                    <div className="bg-secondary/50 p-3 rounded-md">
                      <p className="text-sm mb-2">
                        Você tem {solicitacoesCount} solicitação{solicitacoesCount > 1 ? 'ões' : ''} de ajuste pendente{solicitacoesCount > 1 ? 's' : ''}.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/solicitacoes')}
                        className="w-full"
                      >
                        Ver Solicitações
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
