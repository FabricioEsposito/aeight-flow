import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ReativarContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dataReativacao: string) => void;
  contratoNumero?: string;
}

export function ReativarContratoDialog({
  open,
  onOpenChange,
  onConfirm,
  contratoNumero,
}: ReativarContratoDialogProps) {
  const [dataReativacao, setDataReativacao] = useState<Date>(new Date());

  const handleConfirm = () => {
    onConfirm(format(dataReativacao, 'yyyy-MM-dd'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reativar Contrato</DialogTitle>
          <DialogDescription>
            {contratoNumero
              ? `Reativar o contrato ${contratoNumero}. As parcelas a partir da data de reativação serão exibidas novamente.`
              : 'Selecione a data a partir da qual as parcelas serão exibidas novamente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data de Reativação</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dataReativacao && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataReativacao ? (
                    format(dataReativacao, 'dd/MM/yyyy')
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataReativacao}
                  onSelect={(date) => date && setDataReativacao(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Apenas parcelas com vencimento a partir desta data serão exibidas nas áreas financeiras.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Reativar Contrato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
