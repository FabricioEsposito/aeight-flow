import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export interface CancelarParcelaInfo {
  id: string;
  tipo: 'receber' | 'pagar';
  parcela_id?: string | null;
  descricao: string;
  cliente_fornecedor?: string;
  numero_parcela?: number | string;
  data_vencimento: string;
  valor: number;
}

interface CancelarParcelaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcela: CancelarParcelaInfo | null;
  onConfirm: (motivo: string) => Promise<void> | void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
};

export function CancelarParcelaDialog({
  open,
  onOpenChange,
  parcela,
  onConfirm,
}: CancelarParcelaDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMotivo('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      setError('Informe o motivo do cancelamento.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(motivo.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cancelar parcela do contrato</DialogTitle>
          <DialogDescription>
            A parcela ficará marcada como <strong>Cancelada</strong> e será removida
            das visões financeiras (Extrato, DRE, Fluxo de Caixa, Faturamento). O
            registro permanece visível nas listas para auditoria e pode ser reaberto
            mais tarde.
          </DialogDescription>
        </DialogHeader>

        {parcela && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-sm">
            {parcela.cliente_fornecedor && (
              <div>
                <span className="text-muted-foreground">
                  {parcela.tipo === 'receber' ? 'Cliente: ' : 'Fornecedor: '}
                </span>
                <span className="font-medium">{parcela.cliente_fornecedor}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Descrição: </span>
              <span className="font-medium">{parcela.descricao}</span>
            </div>
            {parcela.numero_parcela !== undefined && parcela.numero_parcela !== '' && (
              <div>
                <span className="text-muted-foreground">Parcela: </span>
                <span className="font-medium">{parcela.numero_parcela}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Vencimento: </span>
              <span className="font-medium">{formatDate(parcela.data_vencimento)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Valor: </span>
              <span className="font-medium">{formatCurrency(parcela.valor)}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="motivo-cancelamento">
            Motivo do cancelamento <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="motivo-cancelamento"
            placeholder="Descreva o motivo do cancelamento desta parcela..."
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError('');
            }}
            rows={4}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Esta ação não exclui o registro. O cancelamento será registrado nas
            observações com data e usuário responsável.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Cancelando...' : 'Cancelar parcela'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
