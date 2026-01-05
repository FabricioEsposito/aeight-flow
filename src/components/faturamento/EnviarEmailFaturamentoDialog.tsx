import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Mail, AlertTriangle, Users, FileText, Loader2 } from 'lucide-react';

interface FaturamentoParaEnvio {
  id: string;
  cliente_razao_social: string;
  cliente_nome_fantasia: string | null;
  numero_nf: string | null;
  valor_liquido: number;
  centro_custo: string | null;
  cliente_emails?: string[];
}

interface EnviarEmailFaturamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturamentos: FaturamentoParaEnvio[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function EnviarEmailFaturamentoDialog({
  open,
  onOpenChange,
  faturamentos,
  onConfirm,
  isLoading = false,
}: EnviarEmailFaturamentoDialogProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Group by client
  const clientesMap = new Map<string, FaturamentoParaEnvio[]>();
  faturamentos.forEach(f => {
    const clienteNome = f.cliente_nome_fantasia || f.cliente_razao_social;
    if (!clientesMap.has(clienteNome)) {
      clientesMap.set(clienteNome, []);
    }
    clientesMap.get(clienteNome)!.push(f);
  });

  const totalClientes = clientesMap.size;
  const totalParcelas = faturamentos.length;
  const totalValor = faturamentos.reduce((sum, f) => sum + f.valor_liquido, 0);

  // Check for missing NFs
  const semNF = faturamentos.filter(f => !f.numero_nf);
  const semEmail = faturamentos.filter(f => !f.cliente_emails || f.cliente_emails.length === 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Confirmar Envio de E-mails
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>Você deseja realmente enviar os e-mails de faturamento?</p>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-foreground">{totalClientes}</p>
                  <p className="text-xs text-muted-foreground">Cliente(s)</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold text-foreground">{totalParcelas}</p>
                  <p className="text-xs text-muted-foreground">Parcela(s)</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalValor)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              {/* Warnings */}
              {(semNF.length > 0 || semEmail.length > 0) && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      {semNF.length > 0 && (
                        <p className="text-amber-700 dark:text-amber-400">
                          {semNF.length} parcela(s) sem NF cadastrada (serão ignoradas)
                        </p>
                      )}
                      {semEmail.length > 0 && (
                        <p className="text-amber-700 dark:text-amber-400">
                          {semEmail.length} cliente(s) sem e-mail cadastrado
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Recipients List */}
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                <div className="p-2 bg-muted/30 border-b sticky top-0">
                  <p className="text-xs font-medium text-muted-foreground">Destinatários:</p>
                </div>
                <div className="divide-y">
                  {Array.from(clientesMap.entries()).map(([clienteNome, parcelas]) => (
                    <div key={clienteNome} className="p-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{clienteNome}</p>
                        <p className="text-xs text-muted-foreground">
                          {parcelas.length} parcela(s) • NF: {parcelas.map(p => p.numero_nf || '-').join(', ')}
                        </p>
                      </div>
                      {parcelas[0].cliente_emails && parcelas[0].cliente_emails.length > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {parcelas[0].cliente_emails.length} e-mail(s)
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Sem e-mail
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CC info */}
              <p className="text-xs text-muted-foreground">
                <strong>CC:</strong> financeiro@aeight.global (em todos os e-mails)
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Confirmar Envio
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
