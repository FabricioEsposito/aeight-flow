import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
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
  const [requests, setRequests] = useState<HierarchyRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfAdmin();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('hierarchy_requests_changes')
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
      const { data, error } = await supabase
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

      setRequests(data as any || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const handleApprove = async (requestId: string, userId: string, requestedRole: string) => {
    setLoading(true);
    try {
      // Update the request status
      const { error: updateError } = await supabase
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
      const { error } = await supabase
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

  if (!isAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4">
          <h3 className="font-semibold mb-4">Notificações</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma notificação
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {request.profiles?.nome || request.profiles?.email}
                    </p>
                    <p className="text-sm font-medium mt-1">
                      Solicita mudança para: <strong>{getRoleLabel(request.requested_role)}</strong>
                    </p>
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
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
