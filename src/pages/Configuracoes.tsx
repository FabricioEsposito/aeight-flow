import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requestedRole, setRequestedRole] = useState<'admin' | 'user'>('user');
  const [currentRole, setCurrentRole] = useState<'admin' | 'user'>('user');
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadCurrentRole();
      loadPendingRequest();
    }
  }, [user]);

  const loadCurrentRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentRole(data.role as 'admin' | 'user');
        setRequestedRole(data.role as 'admin' | 'user');
      }
    } catch (error) {
      console.error('Error loading role:', error);
    }
  };

  const loadPendingRequest = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('hierarchy_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setPendingRequest(data);
    } catch (error) {
      console.error('Error loading pending request:', error);
    }
  };

  const handleRequestChange = async () => {
    if (requestedRole === currentRole) {
      toast({
        title: 'Nenhuma mudança',
        description: 'Você já possui esse nível de hierarquia.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('hierarchy_requests')
        .insert({
          user_id: user?.id,
          requested_role: requestedRole,
        });

      if (error) throw error;

      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação foi enviada ao usuário master e aguarda aprovação.',
      });

      loadPendingRequest();
    } catch (error) {
      console.error('Error requesting change:', error);
      toast({
        title: 'Erro ao enviar solicitação',
        description: 'Não foi possível enviar sua solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Usuário';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas configurações de conta</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nível de Hierarquia</CardTitle>
          <CardDescription>
            Solicite mudança no seu nível de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nível Atual</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{getRoleLabel(currentRole)}</Badge>
            </div>
          </div>

          {pendingRequest ? (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Solicitação Pendente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você solicitou mudança para: <strong>{getRoleLabel(pendingRequest.requested_role)}</strong>
              </p>
              <Badge variant="outline" className="mt-2">Aguardando aprovação</Badge>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="requestedRole">Solicitar Mudança Para</Label>
                <Select
                  value={requestedRole}
                  onValueChange={(value) => setRequestedRole(value as 'admin' | 'user')}
                >
                  <SelectTrigger id="requestedRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleRequestChange} disabled={loading}>
                {loading ? 'Enviando...' : 'Solicitar Mudança'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
