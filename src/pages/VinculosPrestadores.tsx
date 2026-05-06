import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function VinculosPrestadores() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejeitarItem, setRejeitarItem] = useState<any>(null);
  const [motivo, setMotivo] = useState('');
  const [processing, setProcessing] = useState(false);

  if (roleLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: vinculos = [] } = useQuery({
    queryKey: ['vinculos-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vinculos_usuario_fornecedor' as any)
        .select('*, fornecedor:fornecedores(razao_social, nome_fantasia, cnpj_cpf)')
        .eq('status', 'pendente')
        .order('created_at');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Fetch user emails via profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, nome, email');
      return data || [];
    },
  });
  const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

  const aprovar = async (item: any) => {
    setProcessing(true);
    try {
      const { error } = await supabase.from('vinculos_usuario_fornecedor' as any).update({
        status: 'aprovado',
        aprovado_por: user!.id,
        aprovado_em: new Date().toISOString(),
      }).eq('id', item.id);
      if (error) throw error;
      // Atribuir role correspondente
      const role = item.tipo === 'prestador' ? 'prestador_servico' : 'funcionario';
      await supabase.from('user_roles').upsert({ user_id: item.user_id, role } as any, { onConflict: 'user_id,role' });
      toast({ title: 'Vínculo aprovado!' });
      queryClient.invalidateQueries({ queryKey: ['vinculos-pendentes'] });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const rejeitar = async () => {
    if (!rejeitarItem || !motivo.trim()) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('vinculos_usuario_fornecedor' as any).update({
        status: 'rejeitado',
        aprovado_por: user!.id,
        aprovado_em: new Date().toISOString(),
        motivo_rejeicao: motivo,
      }).eq('id', rejeitarItem.id);
      if (error) throw error;
      toast({ title: 'Vínculo rejeitado' });
      queryClient.invalidateQueries({ queryKey: ['vinculos-pendentes'] });
      setRejeitarItem(null); setMotivo('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vínculos de Prestadores/Funcionários</h1>
        <p className="text-muted-foreground">Aprove os auto-cadastros recebidos pelo portal.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Pendentes</CardTitle></CardHeader>
        <CardContent>
          {vinculos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum vínculo pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v: any) => {
                  const p: any = profileMap.get(v.user_id);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">{format(new Date(v.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell className="text-sm">{p?.nome || '-'}<div className="text-xs text-muted-foreground">{p?.email}</div></TableCell>
                      <TableCell><Badge variant="outline">{v.tipo === 'prestador' ? 'Prestador' : 'Funcionário'}</Badge></TableCell>
                      <TableCell className="text-sm">{v.fornecedor?.nome_fantasia || v.fornecedor?.razao_social}</TableCell>
                      <TableCell className="text-xs">{v.fornecedor?.cnpj_cpf}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="default" onClick={() => aprovar(v)} disabled={processing}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejeitarItem(v)}><X className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Dialog open={!!rejeitarItem} onOpenChange={(o) => !o && setRejeitarItem(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Rejeitar vínculo</DialogTitle></DialogHeader>
              <Label>Motivo</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejeitarItem(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={rejeitar} disabled={processing || !motivo.trim()}>
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Rejeitar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
