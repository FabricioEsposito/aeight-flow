import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaSolicitacaoDialog } from '@/components/portal/NovaSolicitacaoDialog';
import { StatusBadge } from './PortalDashboard';
import { openStorageFile } from '@/lib/storage-utils';

export default function PortalNotasFiscais() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ['portal-list', user?.id, 'nf_mensal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_prestador' as any)
        .select('*')
        .eq('solicitante_id', user!.id)
        .eq('tipo', 'nf_mensal')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Notas Fiscais</h1>
          <p className="text-muted-foreground">Envie a NF mensal do seu contrato.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Enviar NF</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          {data.length === 0 ? (
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
                {data.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="text-xs">{String(s.mes_referencia).padStart(2,'0')}/{s.ano_referencia}</TableCell>
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

      <NovaSolicitacaoDialog open={open} onOpenChange={setOpen} tipo="nf_mensal" />
    </div>
  );
}
