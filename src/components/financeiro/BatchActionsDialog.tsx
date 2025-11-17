import React, { useState } from 'react';
import { Calendar, CheckCircle, Copy, X } from 'lucide-react';
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
  actionType: 'change-date' | 'mark-paid' | 'clone' | null;
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
      default:
        return '';
    }
  };

  const handleConfirm = () => {
    if (actionType === 'change-date') {
      onConfirm({ newDate });
    } else {
      onConfirm({});
    }
    setNewDate('');
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={actionType === 'change-date' && !newDate}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
