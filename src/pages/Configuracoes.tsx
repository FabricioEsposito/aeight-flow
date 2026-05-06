import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requestedRole, setRequestedRole] = useState<'admin' | 'user'>('user');
  const [currentRole, setCurrentRole] = useState<'admin' | 'user'>('user');
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<any>(null);

  const runRepair = async (dryRun: boolean) => {
    setRepairing(true);
    setRepairResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('repair-broken-attachments', {
        body: { dryRun },
      });
      if (error) throw error;
      setRepairResult(data);
      toast({
        title: dryRun ? 'Diagnóstico concluído' : 'Reparo concluído',
        description: `Total: ${data.summary.total} | OK: ${data.summary.ok} | ${dryRun ? 'A reparar' : 'Reparados'}: ${data.summary.repaired} | Sem solução: ${data.summary.broken_unrepairable}`,
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro', description: e.message || 'Falha ao executar rotina.', variant: 'destructive' });
    } finally {
      setRepairing(false);
    }
  };

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

      {currentRole === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Reparar Anexos Quebrados
            </CardTitle>
            <CardDescription>
              Varre Contas a Pagar e Receber procurando NF/Boleto com URL inválida e tenta reapontar para o arquivo correto no Storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => runRepair(true)} disabled={repairing}>
                {repairing ? 'Verificando...' : 'Diagnosticar (sem alterar)'}
              </Button>
              <Button onClick={() => runRepair(false)} disabled={repairing}>
                {repairing ? 'Reparando...' : 'Reparar Agora'}
              </Button>
            </div>

            {repairResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Total verificados</p>
                    <p className="text-2xl font-bold">{repairResult.summary.total}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> OK</p>
                    <p className="text-2xl font-bold text-green-600">{repairResult.summary.ok}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground">{repairResult.summary.dryRun ? 'A reparar' : 'Reparados'}</p>
                    <p className="text-2xl font-bold text-primary">{repairResult.summary.repaired}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Sem solução</p>
                    <p className="text-2xl font-bold text-destructive">{repairResult.summary.broken_unrepairable + repairResult.summary.invalid_url}</p>
                  </div>
                </div>

                {repairResult.issues?.length > 0 && (
                  <div className="border rounded-lg max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Tabela</th>
                          <th className="text-left p-2">Campo</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repairResult.issues.map((it: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{it.table}</td>
                            <td className="p-2">{it.field}</td>
                            <td className="p-2">
                              <Badge variant={it.status === 'repaired' ? 'default' : 'destructive'}>
                                {it.status}
                              </Badge>
                            </td>
                            <td className="p-2 font-mono">{it.id.slice(0, 8)}</td>
                            <td className="p-2 text-muted-foreground truncate max-w-xs">{it.reason || it.newUrl || it.oldUrl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
