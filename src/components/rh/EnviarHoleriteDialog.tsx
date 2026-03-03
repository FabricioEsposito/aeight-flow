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

interface HoleriteParaEnvio {
  folha_id: string;
  fornecedor_razao_social: string;
  fornecedor_nome_fantasia: string | null;
  valor_liquido: number;
  competencia: string;
  holerite_url: string;
  fornecedor_emails?: string[];
}

interface EnviarHoleriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holerites: HoleriteParaEnvio[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function EnviarHoleriteDialog({
  open,
  onOpenChange,
  holerites,
  onConfirm,
  isLoading = false,
}: EnviarHoleriteDialogProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalFuncionarios = holerites.length;
  const totalValor = holerites.reduce((sum, h) => sum + h.valor_liquido, 0);

  const semEmail = holerites.filter(h => !h.fornecedor_emails || h.fornecedor_emails.length === 0);
  const comEmail = holerites.filter(h => h.fornecedor_emails && h.fornecedor_emails.length > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Confirmar Envio de Holerites
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>Você deseja realmente enviar os holerites por e-mail?</p>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-foreground">{totalFuncionarios}</p>
                  <p className="text-xs text-muted-foreground">Funcionário(s)</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold text-foreground">{comEmail.length}</p>
                  <p className="text-xs text-muted-foreground">Envio(s)</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(totalValor)}</p>
                  <p className="text-xs text-muted-foreground">Total Líquido</p>
                </div>
              </div>

              {/* Warnings */}
              {semEmail.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <p className="text-amber-700 dark:text-amber-400">
                        {semEmail.length} funcionário(s) sem e-mail cadastrado (serão ignorados)
                      </p>
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
                  {holerites.map((h) => (
                    <div key={h.folha_id} className="p-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {h.fornecedor_nome_fantasia || h.fornecedor_razao_social}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {h.competencia} • {formatCurrency(h.valor_liquido)}
                        </p>
                      </div>
                      {h.fornecedor_emails && h.fornecedor_emails.length > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {h.fornecedor_emails.length} e-mail(s)
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

              {/* Sender info */}
              <p className="text-xs text-muted-foreground">
                <strong>Remetente:</strong> rh@financeiro.aeight.global
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading || comEmail.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar {comEmail.length} Holerite(s)
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
