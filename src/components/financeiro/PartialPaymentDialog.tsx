import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';

interface PartialPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'entrada' | 'saida';
  valorTotal: number;
  onConfirm: (data: {
    isPartial: boolean;
    paymentDate: string;
    paidAmount?: number;
    remainingDueDate?: string;
  }) => void;
}

export function PartialPaymentDialog({
  open,
  onOpenChange,
  tipo,
  valorTotal,
  onConfirm,
}: PartialPaymentDialogProps) {
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [paymentDate, setPaymentDate] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [remainingDueDate, setRemainingDueDate] = useState('');

  useEffect(() => {
    if (open) {
      setPaymentType('full');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaidAmount(0);
      setRemainingDueDate('');
    }
  }, [open]);

  const remainingAmount = valorTotal - paidAmount;
  const isValid = paymentDate && (
    paymentType === 'full' || 
    (paymentType === 'partial' && paidAmount > 0 && paidAmount < valorTotal && remainingDueDate)
  );

  const handleConfirm = () => {
    onConfirm({
      isPartial: paymentType === 'partial',
      paymentDate,
      paidAmount: paymentType === 'partial' ? paidAmount : undefined,
      remainingDueDate: paymentType === 'partial' ? remainingDueDate : undefined,
    });
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {tipo === 'entrada' ? 'Marcar como Recebido' : 'Marcar como Pago'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-lg font-semibold">{formatCurrency(valorTotal)}</p>
          </div>

          <RadioGroup
            value={paymentType}
            onValueChange={(value) => setPaymentType(value as 'full' | 'partial')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="cursor-pointer">
                {tipo === 'entrada' ? 'Recebimento Total' : 'Pagamento Total'}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="partial" />
              <Label htmlFor="partial" className="cursor-pointer">
                {tipo === 'entrada' ? 'Recebimento Parcial' : 'Pagamento Parcial'}
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="payment-date">
              Data da {tipo === 'entrada' ? 'Recebimento' : 'Pagamento'}
            </Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {paymentType === 'partial' && (
            <>
              <div className="space-y-2">
                <Label>
                  Valor {tipo === 'entrada' ? 'Recebido' : 'Pago'}
                </Label>
                <CurrencyInput
                  value={paidAmount}
                  onChange={(val) => setPaidAmount(Math.min(val, valorTotal - 0.01))}
                />
              </div>

              {paidAmount > 0 && paidAmount < valorTotal && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Residual</p>
                    <p className="text-lg font-semibold text-amber-600">
                      {formatCurrency(remainingAmount)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="remaining-due-date">
                      Vencimento do Valor Residual
                    </Label>
                    <Input
                      id="remaining-due-date"
                      type="date"
                      value={remainingDueDate}
                      onChange={(e) => setRemainingDueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {paidAmount >= valorTotal && (
                <p className="text-sm text-destructive">
                  O valor {tipo === 'entrada' ? 'recebido' : 'pago'} deve ser menor que o valor total.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
