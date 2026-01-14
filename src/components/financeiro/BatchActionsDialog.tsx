import React, { useState } from 'react';
import { Calendar, CheckCircle, Copy, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BatchActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  actionType: 'change-date' | 'mark-paid' | 'clone' | 'delete' | null;
  onConfirm: (data: any) => void;
  tipo?: 'entrada' | 'saida';
  allPaid?: boolean;
}

export function BatchActionsDialog({
  open,
  onOpenChange,
  selectedCount,
  actionType,
  onConfirm,
  tipo,
  allPaid = false,
}: BatchActionsDialogProps) {
  const [newDate, setNewDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const getTitle = () => {
    switch (actionType) {
      case 'change-date':
        return 'Alterar Data de Vencimento';
      case 'mark-paid':
        if (allPaid) {
          return 'Voltar para Em Aberto';
        }
        return tipo === 'entrada' ? 'Marcar como Recebido' : 'Marcar como Pago';
      case 'clone':
        return 'Clonar Lançamentos';
      case 'delete':
        return 'Excluir Lançamentos';
      default:
        return 'Ação em Lote';
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case 'change-date':
        return `Alterar a data de vencimento de ${selectedCount} lançamento(s) selecionado(s)`;
      case 'mark-paid':
        if (allPaid) {
          return `Voltar ${selectedCount} lançamento(s) para status em aberto?`;
        }
        return `Marcar ${selectedCount} lançamento(s) como ${tipo === 'entrada' ? 'recebido' : 'pago'}?`;
      case 'clone':
        return `Deseja clonar ${selectedCount} lançamento(s) selecionado(s)?`;
      case 'delete':
        return `Tem certeza que deseja excluir ${selectedCount} lançamento(s)? Esta ação não pode ser desfeita.`;
      default:
        return '';
    }
  };

  const handleConfirm = () => {
    if (actionType === 'change-date') {
      onConfirm({ newDate });
    } else if (actionType === 'mark-paid') {
      onConfirm({ paymentDate });
    } else {
      onConfirm({});
    }
    setNewDate('');
    setPaymentDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">{getDescription()}</p>

          {actionType === 'change-date' && (
            <div className="space-y-2">
              <Label htmlFor="new-date">Nova Data de Vencimento</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          )}

          {actionType === 'mark-paid' && !allPaid && (
            <div className="space-y-2">
              <Label htmlFor="payment-date">Data da Baixa</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          )}

          {actionType === 'delete' && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Atenção: Os lançamentos vinculados a contratos também terão suas parcelas excluídas.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant={actionType === 'delete' ? 'destructive' : 'default'}
            disabled={
              (actionType === 'change-date' && !newDate) ||
              (actionType === 'mark-paid' && !allPaid && !paymentDate)
            }
          >
            {actionType === 'delete' ? 'Excluir' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
