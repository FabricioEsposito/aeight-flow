import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Receipt, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaSolicitacaoDialog } from '@/components/portal/NovaSolicitacaoDialog';
import { StatusBadge } from './portal/PortalDashboard';
import { openStorageFile } from '@/lib/storage-utils';
import { useUserRole } from '@/hooks/useUserRole';

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const { isPrestador, isFuncionario } = useUserRole();
  const [openNF, setOpenNF] = useState(false);
  const [openReemb, setOpenReemb] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ['portal-list', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_prestador' as any)
        .select('*')
        .eq('solicitante_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const reembolsos = data.filter((s: any) => s.tipo === 'reembolso');
  const nfs = data.filter((s: any) => s.tipo === 'nf_mensal');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
        <p className="text-muted-foreground">
          {isPrestador
            ? 'Envie suas notas fiscais mensais e solicitações de reembolso.'
            : 'Solicite reembolsos de despesas com upload do comprovante.'}
        </p>
      </div>

      <Tabs defaultValue={isPrestador ? 'nf' : 'reemb'}>
        <TabsList>
          {isPrestador && <TabsTrigger value="nf">Notas Fiscais</TabsTrigger>}
          <TabsTrigger value="reemb">Reembolsos</TabsTrigger>
        </TabsList>

        {isPrestador && (
          <TabsContent value="nf" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOpenNF(true)}><Plus className="h-4 w-4 mr-1" /> Enviar NF</Button>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Histórico de NFs</CardTitle></CardHeader>
              <CardContent>
                {nfs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma NF enviada ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Mês ref.</TableHead>
                        <TableHead>Nº NF</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Anexo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nfs.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell className="text-xs">{String(s.mes_referencia).padStart(2, '0')}/{s.ano_referencia}</TableCell>
                          <TableCell className="text-sm">{s.numero_nf}</TableCell>
                          <TableCell className="text-right text-sm">R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell><StatusBadge status={s.status} /></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openStorageFile(s.arquivo_path, 'prestador-docs')}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="reemb" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenReemb(true)}><Plus className="h-4 w-4 mr-1" /> Novo reembolso</Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />Histórico de Reembolsos</CardTitle></CardHeader>
            <CardContent>
              {reembolsos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum reembolso solicitado ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Mês ref.</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Anexo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reembolsos.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs">{format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell className="text-xs">{String(s.mes_referencia).padStart(2, '0')}/{s.ano_referencia}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{s.descricao}</TableCell>
                        <TableCell className="text-right text-sm">R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openStorageFile(s.arquivo_path, 'prestador-docs')}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isPrestador && <NovaSolicitacaoDialog open={openNF} onOpenChange={setOpenNF} tipo="nf_mensal" />}
      <NovaSolicitacaoDialog open={openReemb} onOpenChange={setOpenReemb} tipo="reembolso" />
    </div>
  );
}
