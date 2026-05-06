import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, FileText, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  pendente_rh: { label: 'Aguardando RH', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  rejeitado_rh: { label: 'Rejeitado pelo RH', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  aprovado_rh: { label: 'Aguardando Financeiro', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock },
  rejeitado_financeiro: { label: 'Rejeitado pelo Financeiro', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  aprovado_financeiro: { label: 'Aprovado - aguardando pagamento', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  pago: { label: 'Pago', color: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200', icon: CheckCircle2 },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusLabels[status] || { label: status, color: 'bg-muted', icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export default function PortalDashboard() {
  const { user } = useAuth();
  const { isPrestador } = useUserRole();

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['portal-solicitacoes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_prestador' as any)
        .select('*')
        .eq('solicitante_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const pendentes = solicitacoes.filter((s: any) => ['pendente_rh', 'aprovado_rh'].includes(s.status)).length;
  const aprovadas = solicitacoes.filter((s: any) => ['aprovado_financeiro', 'pago'].includes(s.status)).length;
  const rejeitadas = solicitacoes.filter((s: any) => s.status?.startsWith('rejeitado')).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bem-vindo!</h1>
        <p className="text-muted-foreground">Acompanhe suas solicitações abaixo.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Em andamento</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{pendentes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Aprovadas</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-emerald-600">{aprovadas}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejeitadas</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-600">{rejeitadas}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-primary" />
              Solicitar Reembolso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Envie comprovantes de despesas para reembolso.</p>
            <Button asChild className="w-full"><Link to="/portal/reembolsos">Acessar <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </CardContent>
        </Card>
        {isPrestador && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Enviar Nota Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Envie a NF mensal do seu contrato de prestação de serviço.</p>
              <Button asChild className="w-full"><Link to="/portal/notas-fiscais">Acessar <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas solicitações</CardTitle></CardHeader>
        <CardContent>
          {solicitacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação ainda.</p>
          ) : (
            <div className="space-y-2">
              {solicitacoes.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {s.tipo === 'nf_mensal' ? 'NF Mensal' : 'Reembolso'} • R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
